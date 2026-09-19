import express from "express";
import Task, { TASK_STATUS, TASK_PRIORITY, TASK_WEIGHTS } from "../models/Task.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import ActivityLog, { logActivity } from "../models/ActivityLog.js";
import { auth, requireRole, validateId } from "../middleware/auth.js";

const router = express.Router();

const POPULATE = [
  { path: "assignedTo", select: "name email avatarColor" },
  { path: "project", select: "name color status" }
];

const isProjectManager = (project, user) =>
  user.role === "admin" || String(project.manager) === user.id;

const isAssignee = (task, user) => String(task.assignedTo?._id || task.assignedTo) === user.id;

const STATUS_ACTION = {
  "in-progress": "task_started",
  done: "task_completed",
  todo: "task_reopened"
};

// POST /api/tasks
router.post("/", auth, requireRole("manager", "admin"), async (req, res, next) => {
  try {
    const { title, description = "", assignedTo, project, weight = 1, priority = "medium", deadline } = req.body || {};

    if (!title?.trim() || !assignedTo || !project) {
      return res.status(400).json({ msg: "Title, assignee and project are required" });
    }
    if (!TASK_WEIGHTS.includes(Number(weight))) return res.status(400).json({ msg: "Weight must be 1, 2 or 3" });
    if (!TASK_PRIORITY.includes(priority)) return res.status(400).json({ msg: "Invalid priority" });

    const proj = await Project.findById(project);
    if (!proj) return res.status(404).json({ msg: "Project not found" });
    if (!isProjectManager(proj, req.user)) return res.status(403).json({ msg: "You do not manage this project" });
    if (proj.status === "archived") return res.status(400).json({ msg: "Cannot add tasks to an archived project" });

    const member = await User.findOne({ _id: assignedTo, role: "member" });
    if (!member) return res.status(404).json({ msg: "Assignee must be an existing member" });

    // Assigning work makes the person a project member automatically
    if (!proj.members.some((m) => m.equals(member._id))) {
      proj.members.push(member._id);
      await proj.save();
    }

    const task = await Task.create({
      title: title.trim(),
      description: String(description).trim(),
      assignedTo: member._id,
      project: proj._id,
      createdBy: req.user.id,
      weight: Number(weight),
      priority,
      deadline: deadline || null
    });

    await logActivity({ user: req.user.id, project: proj._id, task: task._id, action: "task_created", detail: `assigned to ${member.name}` });

    res.status(201).json(await Task.findById(task._id).populate(POPULATE).lean());
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks?status=&project=&priority=
router.get("/", auth, async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === "member") {
      query.assignedTo = req.user.id;
    } else if (req.user.role === "manager") {
      const mine = await Project.find({ manager: req.user.id }, "_id").lean();
      query.project = { $in: mine.map((p) => p._id) };
    }

    if (req.query.status && TASK_STATUS.includes(req.query.status)) query.status = req.query.status;
    if (req.query.priority && TASK_PRIORITY.includes(req.query.priority)) query.priority = req.query.priority;
    if (req.query.project) query.project = req.query.project;

    const tasks = await Task.find(query).populate(POPULATE).sort({ status: 1, deadline: 1, createdAt: -1 }).lean();
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/project/:projectId  (legacy alias for /projects/:id/tasks)
router.get("/project/:projectId", auth, validateId("projectId"), async (req, res, next) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId }).populate(POPULATE).sort({ status: 1, deadline: 1 }).lean();
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get("/:id", auth, validateId(), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate(POPULATE).lean();
    if (!task) return res.status(404).json({ msg: "Task not found" });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id — managers edit anything; assignees may edit description only
router.put("/:id", auth, validateId(), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: "Task not found" });

    const project = await Project.findById(task.project);
    const manager = project && isProjectManager(project, req.user);
    const assignee = isAssignee(task, req.user);
    if (!manager && !assignee) return res.status(403).json({ msg: "Not authorized" });

    const { title, description, weight, priority, deadline, assignedTo } = req.body || {};
    const changes = [];

    if (description !== undefined && description !== task.description) {
      task.description = String(description).trim();
      changes.push("description");
    }

    if (manager) {
      if (title !== undefined && title.trim() && title.trim() !== task.title) {
        task.title = title.trim();
        changes.push("title");
      }
      if (weight !== undefined) {
        if (!TASK_WEIGHTS.includes(Number(weight))) return res.status(400).json({ msg: "Weight must be 1, 2 or 3" });
        if (Number(weight) !== task.weight) changes.push(`weight → ${weight}`);
        task.weight = Number(weight);
      }
      if (priority !== undefined) {
        if (!TASK_PRIORITY.includes(priority)) return res.status(400).json({ msg: "Invalid priority" });
        if (priority !== task.priority) changes.push(`priority → ${priority}`);
        task.priority = priority;
      }
      if (deadline !== undefined) {
        task.deadline = deadline || null;
        changes.push("deadline");
      }
      if (assignedTo !== undefined && String(assignedTo) !== String(task.assignedTo)) {
        const member = await User.findOne({ _id: assignedTo, role: "member" });
        if (!member) return res.status(404).json({ msg: "Assignee must be an existing member" });
        if (!project.members.some((m) => m.equals(member._id))) {
          project.members.push(member._id);
          await project.save();
        }
        task.assignedTo = member._id;
        changes.push(`reassigned to ${member.name}`);
      }
    } else if (title !== undefined || weight !== undefined || priority !== undefined || deadline !== undefined || assignedTo !== undefined) {
      return res.status(403).json({ msg: "Only the project manager can change title, weight, priority, deadline or assignee" });
    }

    if (changes.length === 0) {
      return res.json(await Task.findById(task._id).populate(POPULATE).lean());
    }

    if (assignee && !manager) task.updatesCount += 1;
    await task.save();
    await logActivity({ user: req.user.id, project: task.project, task: task._id, action: "task_updated", detail: changes.join(", ") });

    res.json(await Task.findById(task._id).populate(POPULATE).lean());
  } catch (err) {
    next(err);
  }
});

/** Shared handler for status transitions. */
async function changeStatus(req, res, next, forcedStatus) {
  try {
    const status = forcedStatus || req.body?.status;
    if (!TASK_STATUS.includes(status)) return res.status(400).json({ msg: "Invalid status" });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: "Task not found" });

    const project = await Project.findById(task.project);
    const manager = project && isProjectManager(project, req.user);
    const assignee = isAssignee(task, req.user);
    if (!manager && !assignee) return res.status(403).json({ msg: "Not authorized" });

    if (task.status === status) {
      return res.json(await Task.findById(task._id).populate(POPULATE).lean());
    }

    task.status = status;
    if (assignee) task.updatesCount += 1;
    await task.save();

    await logActivity({ user: req.user.id, project: task.project, task: task._id, action: STATUS_ACTION[status] });

    res.json(await Task.findById(task._id).populate(POPULATE).lean());
  } catch (err) {
    next(err);
  }
}

// PATCH /api/tasks/:id/status  { status }
router.patch("/:id/status", auth, validateId(), (req, res, next) => changeStatus(req, res, next));

// PUT /api/tasks/:id/complete (legacy)
router.put("/:id/complete", auth, validateId(), (req, res, next) => changeStatus(req, res, next, "done"));

// DELETE /api/tasks/:id
router.delete("/:id", auth, validateId(), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project || !isProjectManager(project, req.user)) return res.status(403).json({ msg: "Not authorized" });

    await logActivity({ user: req.user.id, project: task.project, task: null, action: "task_deleted", detail: task.title });
    await ActivityLog.updateMany({ task: task._id }, { $set: { task: null } });
    await task.deleteOne();

    res.json({ msg: "Task deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
