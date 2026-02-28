import mongoose from "mongoose";

const videoClickSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    videoId:   { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    clickedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for fast teacher queries
videoClickSchema.index({ videoId: 1, studentId: 1 });

export default mongoose.model("VideoClick", videoClickSchema);
