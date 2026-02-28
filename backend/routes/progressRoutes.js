import { Router } from "express";
import {
  updateProgress,
  getMyProgress,
  getAllMyProgress,
  getVideoAnalytics,
  getClassroomAnalytics,
  exportCSV,
  exportClassroomCSV,
  recordVideoClick,
  exportClicksCSV,
  exportAllClicksCSV,
} from "../controllers/progressController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Student heartbeat
router.post("/update", protect, updateProgress);
router.post("/click", protect, recordVideoClick);
router.get("/me", protect, getAllMyProgress);
router.get("/me/:videoId", protect, getMyProgress);

// Teacher analytics
router.get("/analytics/classroom", protect, getClassroomAnalytics);
router.get("/analytics/:videoId", protect, getVideoAnalytics);
router.get("/export-csv/:videoId", protect, exportCSV);
router.get("/export-clicks-csv/:videoId", protect, exportClicksCSV);
router.get("/export-all-clicks-csv", protect, exportAllClicksCSV);
router.get("/export-classroom-csv", protect, exportClassroomCSV);

export default router;
