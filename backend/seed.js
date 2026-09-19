/**
 * Seeds the database with demo data so the app has something to show.
 *
 *   npm run seed            → wipes existing data and inserts the demo set
 *
 * Demo accounts (password for all: Password123)
 *   admin@gradefair.local     admin
 *   priya@gradefair.local     manager
 *   rahul@gradefair.local     manager
 *   ananya@gradefair.local    member
 *   arjun@gradefair.local     member
 *   sneha@gradefair.local     member
 *   vikram@gradefair.local    member
 *   meera@gradefair.local     member
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";
import Project from "./models/Project.js";
import Task from "./models/Task.js";
import Feedback from "./models/Feedback.js";
import ActivityLog from "./models/ActivityLog.js";

dotenv.config();

const PASSWORD = "Password123";
const day = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

await mongoose.connect(process.env.MONGO_URI);
console.log("Connected. Clearing collections…");
await Promise.all([User.deleteMany({}), Project.deleteMany({}), Task.deleteMany({}), Feedback.deleteMany({}), ActivityLog.deleteMany({})]);

const hashed = await bcrypt.hash(PASSWORD, 10);
const mk = (name, email, role, avatarColor) => ({ name, email, role, avatarColor, password: hashed });

const [admin, priya, rahul, ananya, arjun, sneha, vikram, meera] = await User.insertMany([
  mk("Admin", "admin@gradefair.local", "admin", 0),
  mk("Priya Sharma", "priya@gradefair.local", "manager", 265),
  mk("Rahul Verma", "rahul@gradefair.local", "manager", 200),
  mk("Ananya Iyer", "ananya@gradefair.local", "member", 330),
  mk("Arjun Reddy", "arjun@gradefair.local", "member", 20),
  mk("Sneha Patel", "sneha@gradefair.local", "member", 150),
  mk("Vikram Singh", "vikram@gradefair.local", "member", 45),
  mk("Meera Nair", "meera@gradefair.local", "member", 300)
]);

const [p1, p2, p3] = await Project.insertMany([
  {
    name: "Campus Event Portal",
    description: "A web portal where students discover, register for and review campus events. React + Node stack.",
    manager: priya._id,
    members: [ananya._id, arjun._id, sneha._id],
    deadline: day(21),
    color: "#6366f1"
  },
  {
    name: "Library Inventory System",
    description: "Barcode-based tracking of books, borrowers and due dates for the central library.",
    manager: priya._id,
    members: [arjun._id, vikram._id, meera._id],
    deadline: day(35),
    color: "#0ea5e9"
  },
  {
    name: "ML Attendance Recogniser",
    description: "Face-recognition attendance for lecture halls, with a dashboard for faculty.",
    manager: rahul._id,
    members: [ananya._id, sneha._id, vikram._id, meera._id],
    deadline: day(-3),
    status: "completed",
    color: "#10b981"
  }
]);

// [project, assignee, title, weight, priority, status, deadlineOffsetDays, completedOffsetDays]
const taskSpecs = [
  [p1, ananya, "Design database schema for events & registrations", 2, "high", "done", -10, -12],
  [p1, ananya, "Build event listing page with filters", 3, "high", "done", -4, -5],
  [p1, ananya, "Implement event review & star rating", 2, "medium", "in-progress", 5, null],
  [p1, arjun, "Set up authentication with JWT", 2, "high", "done", -8, -6],
  [p1, arjun, "Create registration API + email confirmation", 3, "high", "in-progress", 3, null],
  [p1, arjun, "Write API documentation", 1, "low", "todo", 10, null],
  [p1, sneha, "Landing page UI & responsive layout", 2, "medium", "done", -6, -7],
  [p1, sneha, "Organiser dashboard with attendance stats", 3, "medium", "todo", -1, null],
  [p1, sneha, "Accessibility audit", 1, "low", "todo", 14, null],

  [p2, arjun, "Barcode scanner integration", 3, "high", "in-progress", 6, null],
  [p2, vikram, "Book catalogue CRUD screens", 2, "medium", "done", -2, -3],
  [p2, vikram, "Overdue reminders cron job", 2, "medium", "todo", 8, null],
  [p2, meera, "Borrower profile & history", 2, "medium", "done", -5, -2],
  [p2, meera, "Reports: most borrowed, late returns", 1, "low", "todo", 12, null],

  [p3, ananya, "Collect & label training dataset", 3, "high", "done", -30, -32],
  [p3, sneha, "Train face embedding model", 3, "high", "done", -20, -18],
  [p3, vikram, "Camera capture service", 2, "medium", "done", -15, -16],
  [p3, meera, "Faculty dashboard", 2, "medium", "done", -8, -9],
  [p3, meera, "Deployment & documentation", 1, "low", "done", -3, -4]
];

const tasks = [];
for (const [project, user, title, weight, priority, status, dl, done] of taskSpecs) {
  const t = new Task({
    title,
    description: "",
    assignedTo: user._id,
    project: project._id,
    createdBy: project.manager,
    weight,
    priority,
    status,
    deadline: day(dl),
    updatesCount: status === "done" ? 3 : status === "in-progress" ? 1 : 0
  });
  if (status === "done") t.completedAt = day(done);
  await t.save();
  tasks.push(t);

  await ActivityLog.create({ user: project.manager, project: project._id, task: t._id, action: "task_created", detail: `assigned to ${user.name}`, createdAt: day(dl - 14) });
  if (status !== "todo") await ActivityLog.create({ user: user._id, project: project._id, task: t._id, action: "task_started", createdAt: day(dl - 7) });
  if (status === "done") await ActivityLog.create({ user: user._id, project: project._id, task: t._id, action: "task_completed", createdAt: day(done) });
}

const fb = (from, to, project, rating, comment) => ({ from: from._id, to: to._id, project: project._id, rating, comment });
await Feedback.insertMany([
  fb(arjun, ananya, p1, 5, "Ananya's schema design saved us a lot of rework later."),
  fb(sneha, ananya, p1, 4, "Great collaboration on the listing page."),
  fb(ananya, arjun, p1, 4, "Solid auth work, quick to unblock others."),
  fb(sneha, arjun, p1, 3, "Good work but the registration API is running late."),
  fb(ananya, sneha, p1, 4, "Beautiful landing page."),
  fb(arjun, sneha, p1, 3, "Dashboard still pending, but UI quality is high."),

  fb(vikram, meera, p2, 5, "Borrower history was delivered early and polished."),
  fb(meera, vikram, p2, 4, "Reliable and communicative."),
  fb(arjun, vikram, p2, 4, ""),

  fb(sneha, ananya, p3, 5, "Dataset work was the backbone of the whole project."),
  fb(vikram, ananya, p3, 5, ""),
  fb(ananya, sneha, p3, 5, "Model training was excellent."),
  fb(meera, sneha, p3, 4, ""),
  fb(ananya, vikram, p3, 4, ""),
  fb(sneha, meera, p3, 4, "Dashboard came together nicely."),
  fb(vikram, meera, p3, 5, "")
]);

for (const p of [p1, p2, p3]) {
  await ActivityLog.create({ user: p.manager, project: p._id, action: "project_created", detail: p.name, createdAt: day(-40) });
}

console.log(`Seeded ${await User.countDocuments()} users, ${await Project.countDocuments()} projects, ${await Task.countDocuments()} tasks, ${await Feedback.countDocuments()} feedback entries.`);
console.log(`\nLogin with any of the emails above and password: ${PASSWORD}`);
await mongoose.disconnect();
