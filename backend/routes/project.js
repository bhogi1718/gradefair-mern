import express from "express";
import Project, { PROJECT_STATUS } from "../models/Project.js";
import Task from "../models/Task.js";
import Feedback from "../models/Feedback.js";
import User from "../models/User.js";
import ActivityLog, { logActivity } from "../models/ActivityLog.js";
import { auth, requireRole, validateId } from "../middleware/auth.js";
import { computeScores } from "../utils/score.js";

const router = express.Router();

const POPULATE_MEMBERS = { path: "members", select: "name email role avatarColor" };
const POPULATE_MANAGER = { path: "manager", select: "name email avatarColor" };

/** Visibility filter: admins see all, managers their own, members the ones they belong to. */
function visibleProjectsFilter(user) {
  if (user.role === "admin") return {};
  if (user.role === "manager") return { manager: user.id };
  return { members: user.id };
}

/** Can this user edit / delete the project? */
function canManage(project, user) {
  return user.role === "admin" || String(project.manager?._id || project.manager) === user.id;
}

/** Can this user view the project? */
function canView(project, user) {
  if (canManage(project, user)) return true;
  return (project.members || []).some((m) => String(m?._id || m) === user.id);
}

/** Attaches task counts + progress to a list of lean project docs. */
async function withProgress(projects) {
  const ids = projects.map((p) => p._id);
  const agg = await Task.aggregate([
    { $match: { project: { $in: ids } } },
    {
      $group: {
        _id: "$project",
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$status", "done"] },
                  { $ne: ["$deadline", null] },
                  { $lt: ["$deadline", new Date()] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
  const map = new Map(agg.map((a) => [String(a._id), a]));
  return projects.map((p) => {
    const s = map.get(String(p._id)) || { total: 0, done: 0, inProgress: 0, overdue: 0 };
    return {
      ...p,
      stats: {
        total: s.total,
        done: s.done,
        inProgress: s.inProgress,
        todo: s.total - s.done - s.inProgress,
        overdue: s.overdue,
        progress: s.total ? Math.round((s.done / s.total) * 100) : 0
      }
    };
  });
}

// POST /api/projects
router.post("/", auth, requireRole("manager", "admin"), async (req, res, next) => {
  try {
    const { name, description = "", members = [], deadline, color } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ msg: "Project name is required" });

    const validMembers = await User.find({ _id: { $in: members }, role: "member" }, "_id");

    const project = await Project.create({
      name: name.trim(),
      description: description.trim(),
      manager: req.user.id,
      members: validMembers.map((m) => m._id),
      deadline: deadline || null,
      color: color || undefined
    });

    await logActivity({ user: req.user.id, project: project._id, action: "project_created", detail: project.name });

    const populated = await Project.findById(project._id).populate(POPULATE_MEMBERS).populate(POPULATE_MANAGER).lean();
    const [withStats] = await withProgress([populated]);
    res.status(201).json(withStats);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects
router.get("/", auth, async (req, res, next) => {
  try {
    const filter = visibleProjectsFilter(req.user);
    if (req.query.status && PROJECT_STATUS.includes(req.query.status)) filter.status = req.query.status;

    const projects = await Project.find(filter)
      .populate(POPULATE_MEMBERS)
      .populate(POPULATE_MANAGER)
      .sort({ createdAt: -1 })
      .lean();

    res.json(await withProgress(projects));
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get("/:id", auth, validateId(), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate(POPULATE_MEMBERS).populate(POPULATE_MANAGER).lean();
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (!canView(project, req.user)) return res.status(403).json({ msg: "Access denied" });

    const [withStats] = await withProgress([project]);
    res.json(withStats);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/tasks
router.get("/:id/tasks", auth, validateId(), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (!canView(project, req.user)) return res.status(403).json({ msg: "Access denied" });

    const tasks = await Task.find({ project: project._id })
      .populate("assignedTo", "name email avatarColor")
      .sort({ status: 1, deadline: 1, createdAt: -1 })
      .lean();
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/summary — leaderboard + feedback + activity for the details page
router.get("/:id/summary", auth, validateId(), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (!canView(project, req.user)) return res.status(403).json({ msg: "Access denied" });

    const isManager = canManage(project, req.user);

    const [scores, activity, feedback] = await Promise.all([
      computeScores({ project: project._id }),
      ActivityLog.find({ project: project._id })
        .populate("user", "name avatarColor")
        .populate("task", "title")
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      // Managers see every rating with comments; members see only what they gave
      Feedback.find(isManager ? { project: project._id } : { project: project._id, from: req.user.id })
        .populate("from", "name avatarColor")
        .populate("to", "name avatarColor")
        .sort({ createdAt: -1 })
        .lean()
    ]);

    res.json({ scores, activity, feedback });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id
router.put("/:id", auth, validateId(), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (!canManage(project, req.user)) return res.status(403).json({ msg: "Access denied" });

    const { name, description, status, deadline, color, members } = req.body || {};
    const changes = [];

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ msg: "Project name is required" });
      project.name = name.trim();
    }
    if (description !== undefined) project.description = String(description).trim();
    if (status !== undefined) {
      if (!PROJECT_STATUS.includes(status)) return res.status(400).json({ msg: "Invalid status" });
      if (project.status !== status) changes.push(`status → ${status}`);
      project.status = status;
    }
    if (deadline !== undefined) project.deadline = deadline || null;
    if (color !== undefined) project.color = color;
    if (Array.isArray(members)) {
      const valid = await User.find({ _id: { $in: members }, role: "member" }, "_id");
      project.members = valid.map((m) => m._id);
      changes.push("members updated");
    }

    await project.save();
    await logActivity({ user: req.user.id, project: project._id, action: "project_updated", detail: changes.join(", ") });

    const populated = await Project.findById(project._id).populate(POPULATE_MEMBERS).populate(POPULATE_MANAGER).lean();
    const [withStats] = await withProgress([populated]);
    res.json(withStats);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/members  { userId }
router.post("/:id/members", auth, validateId(), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (!canManage(project, req.user)) return res.status(403).json({ msg: "Access denied" });

    const member = await User.findOne({ _id: req.body.userId, role: "member" });
    if (!member) return res.status(404).json({ msg: "Member not found" });

    if (!project.members.some((m) => m.equals(member._id))) {
      project.members.push(member._id);
      await project.save();
      await logActivity({ user: req.user.id, project: project._id, action: "member_added", detail: member.name });
    }

    const populated = await Project.findById(project._id).populate(POPULATE_MEMBERS).populate(POPULATE_MANAGER).lean();
    res.json(populated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id/members/:userId
router.delete("/:id/members/:userId", auth, validateId(), validateId("userId"), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (!canManage(project, req.user)) return res.status(403).json({ msg: "Access denied" });

    const openTasks = await Task.countDocuments({ project: project._id, assignedTo: req.params.userId, status: { $ne: "done" } });
    if (openTasks > 0) {
      return res.status(400).json({ msg: `This member still has ${openTasks} open task(s). Reassign or delete them first.` });
    }

    const removed = await User.findById(req.params.userId, "name");
    project.members = project.members.filter((m) => String(m) !== req.params.userId);
    await project.save();
    await logActivity({ user: req.user.id, project: project._id, action: "member_removed", detail: removed?.name || "" });

    const populated = await Project.findById(project._id).populate(POPULATE_MEMBERS).populate(POPULATE_MANAGER).lean();
    res.json(populated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id — cascades tasks, feedback and activity
router.delete("/:id", auth, validateId(), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: "Project not found" });
    if (!canManage(project, req.user)) return res.status(403).json({ msg: "Access denied" });

    await Promise.all([
      Task.deleteMany({ project: project._id }),
      Feedback.deleteMany({ project: project._id }),
      ActivityLog.deleteMany({ project: project._id }),
      project.deleteOne()
    ]);

    res.json({ msg: "Project deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
