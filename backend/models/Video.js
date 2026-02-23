import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    description: { type: String, default: "" },
    youtubeUrl:  { type: String, required: true },
    department:  { type: String, required: true },
    semester:    { type: Number, required: true },
    subject:     { type: String, required: true },
    teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    duration:    { type: Number, default: 0 },   // seconds
  },
  { timestamps: true }
);

export default mongoose.model("Video", videoSchema);
