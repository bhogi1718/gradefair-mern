import mongoose from "mongoose";

export const TASK_STATUS = ["todo", "in-progress", "done"];
export const TASK_PRIORITY = ["low", "medium", "high"];
export const TASK_WEIGHTS = [1, 2, 3];

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: { type: String, enum: TASK_STATUS, default: "todo" },
    // Kept in sync with status === "done" for backwards compatibility
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },

    // 1 = small, 2 = medium, 3 = large. Drives contribution points.
    weight: { type: Number, enum: TASK_WEIGHTS, default: 1 },
    priority: { type: String, enum: TASK_PRIORITY, default: "medium" },
    deadline: { type: Date, default: null },

    // Number of meaningful updates made by the assignee (capped in scoring)
    updatesCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, assignedTo: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });

// Keep the legacy boolean aligned with the richer status field
taskSchema.pre("save", function () {
  if (this.isModified("status")) {
    this.completed = this.status === "done";
    if (this.status === "done" && !this.completedAt) this.completedAt = new Date();
    if (this.status !== "done") this.completedAt = null;
  }
});

export default mongoose.model("Task", taskSchema);
