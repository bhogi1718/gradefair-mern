import Task from "../models/Task.js";
import mongoose from "mongoose";
import Feedback from "../models/Feedback.js";
import Project from "../models/Project.js";
import User from "../models/User.js";

/**
 * Contribution scoring — one row per (user, project).
 *
 *   taskPoints   = Σ completed task weight × 10        (1→10, 2→20, 3→30)
 *   timeliness   = +5 per task completed on/before its deadline
 *                  −3 per task completed after its deadline
 *                  −2 per open task that is currently overdue
 *   feedback     = average peer rating (1–5) × 4        (max 20, needs ≥1 rating)
 *   activity     = min(updates, 10) × 1                 (capped so it can't be farmed)
 *   score        = taskPoints + timeliness + feedback + activity   (floored at 0)
 *
 * Only completed tasks earn points, so assigning work does not inflate anyone's score.
 */
export const SCORE_WEIGHTS = {
  perWeightUnit: 10,
  onTimeBonus: 5,
  latePenalty: 3,
  overduePenalty: 2,
  feedbackMultiplier: 4,
  activityCap: 10
};

function emptyRow(user, project) {
  return {
    user,
    project,
    taskPoints: 0,
    timeliness: 0,
    feedback: 0,
    activity: 0,
    score: 0,
    tasksTotal: 0,
    tasksCompleted: 0,
    onTime: 0,
    late: 0,
    overdue: 0,
    avgRating: null,
    ratingCount: 0,
    updates: 0
  };
}

/**
 * @param {object} filter  optional { project?: ObjectId, user?: ObjectId, projects?: ObjectId[] }
 * @returns rows sorted by score desc, each enriched with userName / projectName
 */
export async function computeScores(filter = {}) {
  const taskQuery = {};
  const fbQuery = {};

  if (filter.project) {
    taskQuery.project = filter.project;
    fbQuery.project = filter.project;
  }
  if (filter.projects) {
    taskQuery.project = { $in: filter.projects };
    fbQuery.project = { $in: filter.projects };
  }
  if (filter.user) {
    taskQuery.assignedTo = filter.user;
    fbQuery.to = filter.user;
  }

  const [tasks, feedbacks] = await Promise.all([
    Task.find(taskQuery).lean(),
    Feedback.find(fbQuery).lean()
  ]);

  const now = Date.now();
  const rows = new Map();
  const rowFor = (user, project) => {
    const key = `${user}_${project}`;
    if (!rows.has(key)) rows.set(key, emptyRow(String(user), String(project)));
    return rows.get(key);
  };

  for (const t of tasks) {
    if (!t.assignedTo || !t.project) continue;
    const r = rowFor(t.assignedTo, t.project);
    r.tasksTotal += 1;
    r.updates += t.updatesCount || 0;

    const deadline = t.deadline ? new Date(t.deadline).getTime() : null;

    if (t.status === "done" || t.completed) {
      r.tasksCompleted += 1;
      r.taskPoints += (t.weight || 1) * SCORE_WEIGHTS.perWeightUnit;

      if (deadline) {
        const doneAt = t.completedAt ? new Date(t.completedAt).getTime() : now;
        if (doneAt <= deadline) {
          r.onTime += 1;
          r.timeliness += SCORE_WEIGHTS.onTimeBonus;
        } else {
          r.late += 1;
          r.timeliness -= SCORE_WEIGHTS.latePenalty;
        }
      }
    } else if (deadline && deadline < now) {
      r.overdue += 1;
      r.timeliness -= SCORE_WEIGHTS.overduePenalty;
    }
  }

  // Aggregate peer ratings per (ratee, project)
  const ratingAgg = new Map();
  for (const f of feedbacks) {
    const key = `${f.to}_${f.project}`;
    const cur = ratingAgg.get(key) || { sum: 0, n: 0 };
    cur.sum += f.rating;
    cur.n += 1;
    ratingAgg.set(key, cur);
  }
  for (const [key, { sum, n }] of ratingAgg) {
    const [user, project] = key.split("_");
    const r = rowFor(user, project);
    r.avgRating = Math.round((sum / n) * 10) / 10;
    r.ratingCount = n;
    r.feedback = Math.round((sum / n) * SCORE_WEIGHTS.feedbackMultiplier * 10) / 10;
  }

  for (const r of rows.values()) {
    r.activity = Math.min(r.updates, SCORE_WEIGHTS.activityCap);
    r.score = Math.max(0, Math.round(r.taskPoints + r.timeliness + r.feedback + r.activity));
    r.completionRate = r.tasksTotal ? Math.round((r.tasksCompleted / r.tasksTotal) * 100) : 0;
  }

  // Enrich with names
  const userIds = [...new Set([...rows.values()].map((r) => r.user))];
  const projectIds = [...new Set([...rows.values()].map((r) => r.project))];
  const [users, projects] = await Promise.all([
    User.find({ _id: { $in: userIds } }, "name email avatarColor").lean(),
    Project.find({ _id: { $in: projectIds } }, "name color status").lean()
  ]);
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const projectMap = new Map(projects.map((p) => [String(p._id), p]));

  const result = [...rows.values()].map((r) => {
    const u = userMap.get(r.user);
    const p = projectMap.get(r.project);
    return {
      ...r,
      userName: u?.name || "Unknown user",
      userEmail: u?.email || "",
      avatarColor: u?.avatarColor ?? 220,
      projectName: p?.name || "Unknown project",
      projectColor: p?.color || "#6366f1",
      projectStatus: p?.status || "active"
    };
  });

  // Share of each project's total task points, so the UI can show "% of project".
  // Always computed over *everyone's* completed tasks, even when rows are filtered to one user.
  const totalsAgg = await Task.aggregate([
    { $match: { project: { $in: projectIds.map((id) => new mongoose.Types.ObjectId(id)) }, status: "done" } },
    { $group: { _id: "$project", points: { $sum: { $multiply: [{ $ifNull: ["$weight", 1] }, SCORE_WEIGHTS.perWeightUnit] } } } }
  ]);
  const projectTotals = new Map(totalsAgg.map((t) => [String(t._id), t.points]));
  for (const r of result) {
    const total = projectTotals.get(r.project) || 0;
    r.share = total ? Math.round((r.taskPoints / total) * 100) : 0;
  }

  result.sort((a, b) => b.score - a.score || a.userName.localeCompare(b.userName));
  return result;
}

/** Collapses per-project rows into one row per user. */
export function aggregateByUser(rows) {
  const byUser = new Map();
  for (const r of rows) {
    if (!byUser.has(r.user)) {
      byUser.set(r.user, {
        user: r.user,
        userName: r.userName,
        userEmail: r.userEmail,
        avatarColor: r.avatarColor,
        taskPoints: 0,
        timeliness: 0,
        feedback: 0,
        activity: 0,
        score: 0,
        tasksTotal: 0,
        tasksCompleted: 0,
        onTime: 0,
        late: 0,
        overdue: 0,
        ratingSum: 0,
        ratingCount: 0,
        projects: 0
      });
    }
    const a = byUser.get(r.user);
    a.taskPoints += r.taskPoints;
    a.timeliness += r.timeliness;
    a.feedback += r.feedback;
    a.activity += r.activity;
    a.score += r.score;
    a.tasksTotal += r.tasksTotal;
    a.tasksCompleted += r.tasksCompleted;
    a.onTime += r.onTime;
    a.late += r.late;
    a.overdue += r.overdue;
    if (r.avgRating != null) {
      a.ratingSum += r.avgRating * r.ratingCount;
      a.ratingCount += r.ratingCount;
    }
    a.projects += 1;
  }
  const out = [...byUser.values()].map((a) => ({
    ...a,
    feedback: Math.round(a.feedback * 10) / 10,
    avgRating: a.ratingCount ? Math.round((a.ratingSum / a.ratingCount) * 10) / 10 : null,
    completionRate: a.tasksTotal ? Math.round((a.tasksCompleted / a.tasksTotal) * 100) : 0
  }));
  out.sort((a, b) => b.score - a.score || a.userName.localeCompare(b.userName));
  return out;
}
