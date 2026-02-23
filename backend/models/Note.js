import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    videoId:        { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text:           { type: String, required: true },
    videoTimestamp: { type: Number, required: true }, // in seconds
  },
  { timestamps: true }
);

export default mongoose.model("Note", noteSchema);
