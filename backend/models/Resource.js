import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    description: { type: String, default: "" },
    fileType:    { type: String, enum: ["pdf", "image"], required: true },
    fileName:    { type: String, required: true },
    filePath:    { type: String, required: true },
    category:    { type: String, enum: ["Question Paper", "Records", "Assignment", "Other"], default: "Other" },
    department:  { type: String, default: "" },
    semester:    { type: Number, default: 1 },
    subject:     { type: String, default: "" },
    teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Resource", resourceSchema);
