/**
 * Creates (or promotes) an admin account.
 *
 *   node createAdmin.js                      → admin@gradefair.local / Admin@123
 *   node createAdmin.js you@x.com Secret123  → custom credentials
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const email = (process.argv[2] || "admin@gradefair.local").toLowerCase();
const password = process.argv[3] || "Admin@123";
const name = process.argv[4] || "Admin";

await mongoose.connect(process.env.MONGO_URI);

const existing = await User.findOne({ email });
if (existing) {
  existing.role = "admin";
  existing.password = await bcrypt.hash(password, 10);
  await existing.save();
  console.log(`Updated existing user ${email} → role admin, password reset.`);
} else {
  await User.create({ name, email, password: await bcrypt.hash(password, 10), role: "admin" });
  console.log(`Admin created: ${email} / ${password}`);
}

await mongoose.disconnect();
