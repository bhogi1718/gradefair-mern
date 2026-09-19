import jwt from "jsonwebtoken";
import mongoose from "mongoose";

/** Verifies the Bearer token and attaches { id, role } to req.user. */
export const auth = (req, res, next) => {
  const header = req.header("Authorization");
  if (!header) return res.status(401).json({ msg: "No token, authorization denied" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "Token format invalid" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ msg: "Session expired, please log in again", code: "TOKEN_INVALID" });
  }
};

/** Restricts a route to the given roles. Usage: requireRole("manager", "admin") */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ msg: "Access denied" });
  }
  next();
};

/** Rejects malformed ObjectIds early so Mongoose doesn't throw a CastError. */
export const validateId = (param = "id") => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
    return res.status(400).json({ msg: "Invalid id" });
  }
  next();
};

export default auth;
