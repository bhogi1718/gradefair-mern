import express from "express";
import ActivityLog from "../models/ActivityLog.js";
import Project from "../models/Project.js";
import { auth, validateId } from "../middleware/auth.js";

const router = express.Router();

const POPULATE = [
  { path: "user", select: "name avatarColor role" },
  { path: "task", select: "title status" },
  { path: "project", select: "name color" }
];

const clampLimit = (v, def = 50, max = 200) => Math.min(max, Math.max(1, parseInt(v, 10) || def));

// GET /api/activity?limit=&page=  — scoped feed
//   admin   → everything
//   manager → activity in projects they manage
//   member  → activity in projects they belong to
router.get("/", auth, async (req, res, next) => {
  try {
    const limit = clampLimit(req.query.limit);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const filter = {};
    if (req.user.role === "manager") {
      const mine = await Project.find({ manager: req.user.id }, "_id").lean();
      filter.project = { $in: mine.map((p) => p._id) };
    } else if (req.user.role === "member") {
      const mine = await Project.find({ members: req.user.id }, "_id").lean();
      filter.project = { $in: mine.map((p) => p._id) };
    }
    if (req.query.action) filter.action = req.query.action;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ActivityLog.countDocuments(filter)
    ]);

    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/activity/me — only what the logged-in user did
router.get("/me", auth, async (req, res, next) => {
  try {
    const limit = clampLimit(req.query.limit);
    const logs = await ActivityLog.find({ user: req.user.id }).populate(POPULATE).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ logs, total: logs.length, page: 1, pages: 1 });
  } catch (err) {
    next(err);
  }
});

// GET /api/activity/project/:projectId
router.get("/project/:projectId", auth, validateId("projectId"), async (req, res, next) => {
  try {
    const limit = clampLimit(req.query.limit);
    const logs = await ActivityLog.find({ project: req.params.projectId }).populate(POPULATE).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ logs, total: logs.length, page: 1, pages: 1 });
  } catch (err) {
    next(err);
  }
});

export default router;
