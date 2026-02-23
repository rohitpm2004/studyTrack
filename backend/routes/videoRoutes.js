import { Router } from "express";
import {
  createVideo,
  getVideos,
  getVideo,
  updateVideo,
  deleteVideo,
} from "../controllers/videoController.js";
import { protect, teacherOnly } from "../middleware/auth.js";

const router = Router();

router.post("/", protect, teacherOnly, createVideo);
router.get("/", protect, getVideos);
router.get("/:id", protect, getVideo);
router.put("/:id", protect, teacherOnly, updateVideo);
router.delete("/:id", protect, teacherOnly, deleteVideo);

export default router;
