import express from "express";
import bcrypt from "bcryptjs";
import User, { ROLES } from "../models/User.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Feedback from "../models/Feedback.js";
import ActivityLog from "../models/ActivityLog.js";
import { auth, requireRole, validateId } from "../middleware/auth.js";

const router = express.Router();

router.use(auth, requireRole("admin"));

// GET /api/admin/stats — platform overview
router.get("/stats", async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [users, byRole, projects, tasks, doneTasks, feedback, recentActivity, newUsers] = await Promise.all([
      User.countDocuments(),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Project.countDocuments(),
      Task.countDocuments(),
      Task.countDocuments({ status: "done" }),
      Feedback.countDocuments(),
      ActivityLog.countDocuments({ createdAt: { $gte: since } }),
      User.countDocuments({ createdAt: { $gte: since } })
    ]);

    res.json({
      users,
      usersByRole: Object.fromEntries(byRole.map((r) => [r._id, r.count])),
      projects,
      tasks,
      doneTasks,
      feedback,
      activityLast7Days: recentActivity,
      newUsersLast7Days: newUsers
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find({}, "name email role avatarColor createdAt lastLoginAt").sort({ createdAt: -1 }).lean();

    // Attach a little context per user (task counts / projects managed)
    const [taskAgg, projAgg] = await Promise.all([
      Task.aggregate([{ $group: { _id: "$assignedTo", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } } } }]),
      Project.aggregate([{ $group: { _id: "$manager", count: { $sum: 1 } } }])
    ]);
    const taskMap = new Map(taskAgg.map((t) => [String(t._id), t]));
    const projMap = new Map(projAgg.map((p) => [String(p._id), p.count]));

    res.json(
      users.map((u) => ({
        ...u,
        tasksTotal: taskMap.get(String(u._id))?.total || 0,
        tasksDone: taskMap.get(String(u._id))?.done || 0,
        projectsManaged: projMap.get(String(u._id)) || 0
      }))
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users — create a user with any role
router.post("/users", async (req, res, next) => {
  try {
    const { name, email, password, role = "member" } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ msg: "Name, email and password are required" });
    if (!ROLES.includes(role)) return res.status(400).json({ msg: "Invalid role" });
    if (password.length < 6) return res.status(400).json({ msg: "Password must be at least 6 characters" });

    const exists = await User.findOne({ email: email.trim().toLowerCase() });
    if (exists) return res.status(400).json({ msg: "Email already in use" });

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: await bcrypt.hash(password, 10),
      role
    });
    res.status(201).json(user.toSafeJSON());
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/role  { role }
router.put("/users/:id/role", validateId(), async (req, res, next) => {
  try {
    const { role } = req.body || {};
    if (!ROLES.includes(role)) return res.status(400).json({ msg: "Invalid role" });
    if (req.params.id === req.user.id) return res.status(400).json({ msg: "You cannot change your own role" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role === "manager" && role !== "manager") {
      const managed = await Project.countDocuments({ manager: user._id });
      if (managed > 0) return res.status(400).json({ msg: `This manager still owns ${managed} project(s). Reassign or delete them first.` });
    }
    if (user.role === "member" && role !== "member") {
      const open = await Task.countDocuments({ assignedTo: user._id, status: { $ne: "done" } });
      if (open > 0) return res.status(400).json({ msg: `This member still has ${open} open task(s).` });
    }

    user.role = role;
    await user.save();
    res.json(user.toSafeJSON());
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/password — reset someone's password
router.put("/users/:id/password", validateId(), async (req, res, next) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ msg: "Password must be at least 6 characters" });

    const user = await User.findById(req.params.id).select("+password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ msg: "Password reset" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", validateId(), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ msg: "You cannot delete your own account" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const managed = await Project.countDocuments({ manager: user._id });
    if (managed > 0) return res.status(400).json({ msg: `This user manages ${managed} project(s). Delete or reassign them first.` });

    const open = await Task.countDocuments({ assignedTo: user._id, status: { $ne: "done" } });
    if (open > 0) return res.status(400).json({ msg: `This user has ${open} open task(s). Reassign or delete them first.` });

    await Promise.all([
      Project.updateMany({ members: user._id }, { $pull: { members: user._id } }),
      Feedback.deleteMany({ $or: [{ from: user._id }, { to: user._id }] }),
      user.deleteOne()
    ]);

    res.json({ msg: "User deleted" });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/projects — every project with manager info
router.get("/projects", async (req, res, next) => {
  try {
    const projects = await Project.find()
      .populate("manager", "name email")
      .populate("members", "name")
      .sort({ createdAt: -1 })
      .lean();
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

export default router;
