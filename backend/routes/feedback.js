import express from "express";
import Feedback from "../models/Feedback.js";
import Project from "../models/Project.js";
import { logActivity } from "../models/ActivityLog.js";
import { auth, requireRole, validateId } from "../middleware/auth.js";

const router = express.Router();

const isMemberOf = (project, userId) => project.members.some((m) => String(m) === String(userId));

// POST /api/feedback  { to, project, rating, comment } — create or update
router.post("/", auth, requireRole("member"), async (req, res, next) => {
  try {
    const { to, project, rating, comment = "" } = req.body || {};
    if (!to || !project || rating === undefined) return res.status(400).json({ msg: "Teammate, project and rating are required" });

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ msg: "Rating must be a whole number from 1 to 5" });
    if (String(to) === req.user.id) return res.status(400).json({ msg: "You cannot rate yourself" });

    const proj = await Project.findById(project);
    if (!proj) return res.status(404).json({ msg: "Project not found" });
    if (!isMemberOf(proj, req.user.id)) return res.status(403).json({ msg: "You are not part of this project" });
    if (!isMemberOf(proj, to)) return res.status(400).json({ msg: "That user is not part of this project" });

    const feedback = await Feedback.findOneAndUpdate(
      { from: req.user.id, to, project },
      { rating: r, comment: String(comment).trim().slice(0, 500) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate("to", "name avatarColor")
      .populate("project", "name color");

    await logActivity({ user: req.user.id, project: proj._id, action: "feedback_given", detail: `rated ${feedback.to.name} ${r}/5` });

    res.json({ msg: "Feedback saved", feedback });
  } catch (err) {
    next(err);
  }
});

// GET /api/feedback/me/received
router.get("/me/received", auth, async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find({ to: req.user.id })
      .populate("from", "name avatarColor")
      .populate("project", "name color")
      .sort({ createdAt: -1 })
      .lean();
    res.json(feedbacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/feedback/me/given
router.get("/me/given", auth, async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find({ from: req.user.id })
      .populate("to", "name avatarColor")
      .populate("project", "name color")
      .sort({ createdAt: -1 })
      .lean();
    res.json(feedbacks);
  } catch (err) {
    next(err);
  }
});

// GET /api/feedback/project/:projectId — manager / admin view with comments
router.get("/project/:projectId", auth, validateId("projectId"), async (req, res, next) => {
  try {
    const proj = await Project.findById(req.params.projectId).lean();
    if (!proj) return res.status(404).json({ msg: "Project not found" });

    const isManager = req.user.role === "admin" || String(proj.manager) === req.user.id;
    if (!isManager) return res.status(403).json({ msg: "Only the project manager can view this" });

    const feedbacks = await Feedback.find({ project: proj._id })
      .populate("from", "name avatarColor")
      .populate("to", "name avatarColor")
      .sort({ createdAt: -1 })
      .lean();
    res.json(feedbacks);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/feedback/:id — author can retract their own rating
router.delete("/:id", auth, validateId(), async (req, res, next) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ msg: "Feedback not found" });
    if (String(fb.from) !== req.user.id && req.user.role !== "admin") return res.status(403).json({ msg: "Not authorized" });
    await fb.deleteOne();
    res.json({ msg: "Feedback removed" });
  } catch (err) {
    next(err);
  }
});

export default router;
