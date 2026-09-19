import mongoose from "mongoose";

export const ACTIVITY_ACTIONS = [
  "task_created",
  "task_updated",
  "task_started",
  "task_completed",
  "task_reopened",
  "task_deleted",
  "project_created",
  "project_updated",
  "project_deleted",
  "member_added",
  "member_removed",
  "feedback_given"
];

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true },
    // Human readable detail, e.g. "changed priority to high"
    detail: { type: String, default: "" }
  },
  { timestamps: true }
);

activityLogSchema.index({ project: 1, createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

/** Fire-and-forget helper so a logging failure never breaks the main request. */
export async function logActivity({ user, project, task = null, action, detail = "" }) {
  try {
    await ActivityLog.create({ user, project, task, action, detail });
  } catch (err) {
    console.error("ACTIVITY LOG ERROR:", err.message);
  }
}

export default ActivityLog;
