import express from "express";
import { protect } from "../middleware/auth.js";
import { getMyNotes, addNote, deleteNote } from "../controllers/noteController.js";

const router = express.Router();

router.get("/:videoId", protect, getMyNotes);
router.post("/", protect, addNote);
router.delete("/:id", protect, deleteNote);

export default router;
