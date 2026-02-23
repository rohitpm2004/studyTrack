import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    studentId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    videoId:      { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    watchTime:    { type: Number, default: 0 },       // total seconds watched
    lastPosition: { type: Number, default: 0 },       // resume point in seconds
    isCompleted:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// one progress doc per student-video pair
progressSchema.index({ studentId: 1, videoId: 1 }, { unique: true });

export default mongoose.model("Progress", progressSchema);
