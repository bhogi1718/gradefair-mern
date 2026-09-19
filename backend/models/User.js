import mongoose from "mongoose";

export const ROLES = ["admin", "manager", "member"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "member" },
    // Short blurb shown on the profile page
    bio: { type: String, default: "", maxlength: 200 },
    // Deterministic avatar hue so the UI can colour initials consistently
    avatarColor: { type: Number, default: () => Math.floor(Math.random() * 360) },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    bio: this.bio,
    avatarColor: this.avatarColor,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt
  };
};

export default mongoose.model("User", userSchema);
