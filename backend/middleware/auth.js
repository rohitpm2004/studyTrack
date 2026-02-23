import jwt from "jsonwebtoken";
import User from "../models/User.js";

/** Verify JWT and attach req.user */
export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer "))
      return res.status(401).json({ msg: "Not authorized — no token" });

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ msg: "User not found" });
    next();
  } catch {
    res.status(401).json({ msg: "Token invalid or expired" });
  }
};

/** Restrict to teachers only */
export const teacherOnly = (req, res, next) => {
  if (req.user?.role !== "teacher")
    return res.status(403).json({ msg: "Teachers only" });
  next();
};
