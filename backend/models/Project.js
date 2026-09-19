import mongoose from "mongoose";

export const PROJECT_STATUS = ["active", "completed", "archived"];

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: PROJECT_STATUS, default: "active" },
    deadline: { type: Date, default: null },
    // Accent colour used by the UI for the project chip
    color: { type: String, default: "#6366f1" }
  },
  { timestamps: true }
);

projectSchema.index({ manager: 1 });
projectSchema.index({ members: 1 });

export default mongoose.model("Project", projectSchema);
