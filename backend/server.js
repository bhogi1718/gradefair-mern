import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/task.js";
import userRoutes from "./routes/user.js";
import projectRoutes from "./routes/project.js";
import scoreRoutes from "./routes/score.js";
import adminRoutes from "./routes/admin.js";
import feedbackRoutes from "./routes/feedback.js";
import activityRoutes from "./routes/activity.js";

dotenv.config();

for (const key of ["MONGO_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`Missing required env var ${key}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const app = express();

// Allow a comma separated list of origins, e.g. "http://localhost:3000,https://app.example.com"
const allowedOrigins = (process.env.CLIENT_URL || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

// Tiny request logger in development
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`));
    next();
  });
}

app.get("/api/health", (req, res) =>
  res.json({ ok: true, db: mongoose.connection.readyState === 1 ? "connected" : "disconnected", uptime: process.uptime() })
);

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/users", userRoutes);
app.use("/api/score", scoreRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/activity", activityRoutes);

// 404 for unknown API routes
app.use((req, res) => res.status(404).json({ msg: `Route ${req.method} ${req.originalUrl} not found` }));

// Central error handler — converts Mongoose errors into readable 400s
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === "ValidationError") {
    const msg = Object.values(err.errors).map((e) => e.message).join(", ");
    return res.status(400).json({ msg });
  }
  if (err.name === "CastError") return res.status(400).json({ msg: `Invalid ${err.path}` });
  if (err.code === 11000) return res.status(400).json({ msg: "Duplicate entry" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ msg: "Malformed JSON body" });

  console.error("UNHANDLED ERROR:", err);
  res.status(err.status || 500).json({ msg: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`GradeFair API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
