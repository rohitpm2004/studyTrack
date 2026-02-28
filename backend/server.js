import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";

/* ===================== Connect to MongoDB ===================== */
connectDB();

const app = express();

/* ===================== __dirname for ES modules ===================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===================== Middleware ===================== */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json());

/* Serve uploaded files */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===================== Routes ===================== */
app.get("/", (_req, res) => res.send("StudyTrack API v2 🚀"));

app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notes", noteRoutes);

/* ===================== Global Error Handler ===================== */
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ msg: err.message || "Internal server error" });
});

/* ===================== Start ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
