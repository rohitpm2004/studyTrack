import express from "express";
import { protect } from "../middleware/auth.js";
import { getComments, addComment, deleteComment } from "../controllers/commentController.js";

const router = express.Router();

router.get("/:videoId", protect, getComments);
router.post("/", protect, addComment);
router.delete("/:id", protect, deleteComment);

export default router;
