import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Feedback from "../models/Feedback.js";
import auth from "../middleware/auth.js";
import { computeScores, aggregateByUser } from "../utils/score.js";

const router = express.Router();

// GET /api/users — directory of members (+ managers for admins). Used for assignment pickers.
router.get("/", auth, async (req, res, next) => {
  try {
    const roleFilter = req.user.role === "admin" ? {} : { role: "member" };
    const users = await User.find(roleFilter, "name email role avatarColor").sort({ name: 1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/stats — everything the profile page needs in one call
router.get("/me/stats", auth, async (req, res, next) => {
  try {
    const me = req.user.id;
    const [tasks, projects, received, given, rows] = await Promise.all([
      Task.find({ assignedTo: me }).lean(),
      Project.countDocuments({ $or: [{ members: me }, { manager: me }] }),
      Feedback.find({ to: me }).populate("from", "name avatarColor").populate("project", "name color").sort({ createdAt: -1 }).lean(),
      Feedback.countDocuments({ from: me }),
      computeScores({ user: me })
    ]);

    const overall = aggregateByUser(rows)[0] || null;
    const now = Date.now();

    res.json({
      tasks: {
        total: tasks.length,
        done: tasks.filter((t) => t.status === "done").length,
        inProgress: tasks.filter((t) => t.status === "in-progress").length,
        overdue: tasks.filter((t) => t.status !== "done" && t.deadline && new Date(t.deadline) < now).length
      },
      projects,
      feedbackReceived: received,
      feedbackGivenCount: given,
      overall,
      perProject: rows
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me — update own profile
router.put("/me", auth, async (req, res, next) => {
  try {
    const { name, bio, avatarColor } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ msg: "Name cannot be empty" });
      user.name = name.trim();
    }
    if (bio !== undefined) user.bio = String(bio).slice(0, 200);
    if (avatarColor !== undefined && Number.isFinite(Number(avatarColor))) {
      user.avatarColor = ((Number(avatarColor) % 360) + 360) % 360;
    }

    await user.save();
    res.json(user.toSafeJSON());
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me/password
router.put("/me/password", auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: "Both current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ msg: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id).select("+password");
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ msg: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ msg: "Password updated" });
  } catch (err) {
    next(err);
  }
});

export default router;
