import express from "express";
import Project from "../models/Project.js";
import { auth, validateId } from "../middleware/auth.js";
import { computeScores, aggregateByUser, SCORE_WEIGHTS } from "../utils/score.js";

const router = express.Router();

/** Projects the requester is allowed to see scores for. */
async function scopedProjectIds(user) {
  if (user.role === "admin") return null; // no restriction
  const filter = user.role === "manager" ? { manager: user.id } : { members: user.id };
  const projects = await Project.find(filter, "_id").lean();
  return projects.map((p) => p._id);
}

// GET /api/score/weights — the formula, so the UI can explain it
router.get("/weights", auth, (req, res) => res.json(SCORE_WEIGHTS));

// GET /api/score/project — per (user, project) rows within the requester's scope
router.get("/project", auth, async (req, res, next) => {
  try {
    const ids = await scopedProjectIds(req.user);
    const rows = await computeScores(ids ? { projects: ids } : {});
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/score/project/:id — a single project's leaderboard
router.get("/project/:id", auth, validateId(), async (req, res, next) => {
  try {
    const ids = await scopedProjectIds(req.user);
    if (ids && !ids.some((id) => String(id) === req.params.id)) return res.status(403).json({ msg: "Access denied" });
    res.json(await computeScores({ project: req.params.id }));
  } catch (err) {
    next(err);
  }
});

// GET /api/score/overall — aggregated per user across the requester's projects
router.get("/overall", auth, async (req, res, next) => {
  try {
    const ids = await scopedProjectIds(req.user);
    const rows = await computeScores(ids ? { projects: ids } : {});
    res.json(aggregateByUser(rows));
  } catch (err) {
    next(err);
  }
});

// GET /api/score/me — the logged-in user's breakdown
router.get("/me", auth, async (req, res, next) => {
  try {
    const rows = await computeScores({ user: req.user.id });
    res.json({ perProject: rows, overall: aggregateByUser(rows)[0] || null });
  } catch (err) {
    next(err);
  }
});

export default router;
