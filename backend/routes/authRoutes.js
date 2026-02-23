import { Router } from "express";
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  getEnrolledStudents,
  exportStudentsCSV,
} from "../controllers/authController.js";
import { protect, teacherOnly } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

/* 5 login attempts per 15 minutes per IP */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many login attempts. Please try again in 15 minutes." },
});

const router = Router();

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.get("/me", protect, getMe);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/students", protect, teacherOnly, getEnrolledStudents);
router.get("/export-students", protect, teacherOnly, exportStudentsCSV);

export default router;
