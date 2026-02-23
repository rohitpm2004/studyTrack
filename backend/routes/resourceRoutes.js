import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { protect, teacherOnly } from "../middleware/auth.js";
import { uploadResource, getResources, deleteResource } from "../controllers/resourceController.js";

/* ---- Multer config ---- */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDFs and images (JPEG, PNG, GIF, WEBP) are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

const router = express.Router();

router.post("/", protect, teacherOnly, upload.single("file"), uploadResource);
router.get("/", protect, getResources);
router.delete("/:id", protect, teacherOnly, deleteResource);

export default router;
