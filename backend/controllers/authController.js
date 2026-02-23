import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import generateToken from "../utils/generateToken.js";

/* ===================== REGISTER ===================== */
export const register = async (req, res) => {
  try {
    const { name, email, password, role, collegeName, group, department, semester, classCode } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ msg: "All fields are required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email,
      password: hashed,
      role,
      collegeName: collegeName || "",
      group: group || "",
      department: department || "",
      semester: Number(semester) || 1,
    };

    if (role === "teacher") {
      // VALIDATION: Only specific teacher emails allowed
      if (!email.endsWith("teacher0817@gmail.com")) {
        return res.status(400).json({ msg: "Only authorized teachers can create accounts. Please use the correct institutional email." });
      }
      // Generate a unique class code for the teacher (kept for backward compatibility/legacy)
      userData.classCode = await User.generateClassCode();
    }

    if (role === "student") {
      // In Open Access, students don't need a class code or teacherId
      userData.teacherId = null; 
    }

    const user = await User.create(userData);

    const responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      group: user.group,
      department: user.department,
      semester: user.semester,
    };

    if (user.role === "teacher") responseUser.classCode = user.classCode;
    if (user.role === "student") responseUser.teacherId = user.teacherId;

    res.status(201).json({ token: generateToken(user), user: responseUser });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== LOGIN ===================== */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Invalid credentials" });

    const responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      group: user.group,
      department: user.department,
      semester: user.semester,
    };

    if (user.role === "teacher") responseUser.classCode = user.classCode;
    if (user.role === "student") responseUser.teacherId = user.teacherId;

    res.json({ token: generateToken(user), user: responseUser });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== GET ME ===================== */
export const getMe = async (req, res) => {
  const user = req.user;
  const responseUser = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    group: user.group,
    department: user.department,
    semester: user.semester,
  };

  if (user.role === "teacher") responseUser.classCode = user.classCode;
  if (user.role === "student") responseUser.teacherId = user.teacherId;

  res.json({ user: responseUser });
};

/* ===================== FORGOT PASSWORD ===================== */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const user = await User.findOne({ email });
    // Always return 200 to avoid leaking whether email exists
    if (!user) return res.json({ msg: "If that email is registered, a reset link has been sent." });

    // Generate token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetToken = hashedToken;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"StudyTrack" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "StudyTrack — Password Reset",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#7c3aed">StudyTrack Password Reset</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#888;font-size:0.85rem">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ msg: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ msg: `Failed to send reset email: ${err.message}` });
  }
};

/* ===================== RESET PASSWORD ===================== */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ msg: "Token and new password are required" });
    if (password.length < 6)
      return res.status(400).json({ msg: "Password must be at least 6 characters" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ msg: "Reset link is invalid or has expired" });

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ msg: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== GET ENROLLED STUDENTS (Teacher) ===================== */
export const getEnrolledStudents = async (req, res) => {
  try {
    if (req.user.role !== "teacher")
      return res.status(403).json({ msg: "Teachers only" });

    // Flexible matching for department changes (e.g. "Computer Science" vs "Computer Science Department")
    const deptMatch = req.user.department?.replace(/ Department$/, "") || "";
    
    const students = await User.find({ 
      department: { $regex: new RegExp(deptMatch, "i") },
      role: "student" 
    })
      .select("name email group collegeName semester createdAt")
      .sort({ semester: 1, name: 1 });

    res.json(students);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== EXPORT STUDENTS (Teacher) ===================== */
export const exportStudentsCSV = async (req, res) => {
  try {
    if (req.user.role !== "teacher")
      return res.status(403).json({ msg: "Teachers only" });

    const deptMatch = req.user.department?.replace(/ Department$/, "") || "";
    const students = await User.find({ 
      department: { $regex: new RegExp(`^${deptMatch}`, "i") },
      role: "student" 
    })
    .select("name email group collegeName semester createdAt")
    .sort({ semester: 1, name: 1 });

    let csv = "Name,Email,Semester,Group/Section,College,Registration Date\n";
    for (const s of students) {
      csv += `"${s.name}","${s.email}",${s.semester},"${s.group || "-"}","${s.collegeName || "-"}","${new Date(s.createdAt).toLocaleDateString()}"\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="Students-${deptMatch}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
