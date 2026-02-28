import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    description: { type: String, default: "" },
    title:       { type: String, required: true },
    description: { type: String, default: "" },
    videoUrl:    { type: String, required: true },
    videoSource: { type: String, enum: ["youtube", "drive"], default: "youtube" },
    department:  { type: String, required: true },
    semester:    { type: Number, required: true },
    subject:     { type: String, required: true },
    teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    duration:    { type: Number, default: 0 },   // seconds
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for legacy support and easy access
videoSchema.virtual("youtubeUrl").get(function() {
  return this.videoUrl;
}).set(function(val) {
  this.videoUrl = val;
});


export default mongoose.model("Video", videoSchema);
