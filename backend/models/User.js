import mongoose from "mongoose";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    email:       { type: String, required: true, unique: true },
    password:    { type: String, required: true },
    role:        { type: String, enum: ["teacher", "student"], required: true },
    collegeName: { type: String, default: "" },
    group:       { type: String, default: "" },
    department:  { type: String, default: "" },
    semester:    { type: Number, default: 1 },

    // Teachers: unique class code students use to join
    classCode:   { type: String, unique: true, sparse: true },

    // Students: reference to the teacher they joined (No longer mandatory in Open Access)
    teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Password reset
    resetToken:       { type: String, default: null },
    resetTokenExpiry: { type: Date,   default: null },
  },
  { timestamps: true }
);

// Generate a random 6-char alphanumeric class code
userSchema.statics.generateClassCode = async function () {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 to avoid confusion
  let code;
  let exists = true;
  while (exists) {
    code = "";
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    exists = await this.findOne({ classCode: code });
  }
  return code;
};

export default mongoose.model("User", userSchema);
