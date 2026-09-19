import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

// One rating per (rater, ratee, project) — re-submitting updates the existing one
feedbackSchema.index({ from: 1, to: 1, project: 1 }, { unique: true });

feedbackSchema.pre("save", function () {
  if (this.from.toString() === this.to.toString()) {
    throw new Error("You cannot rate yourself");
  }
});

export default mongoose.model("Feedback", feedbackSchema);
