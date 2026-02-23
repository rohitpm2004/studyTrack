import Resource from "../models/Resource.js";
import fs from "fs";
import path from "path";

/* ===================== UPLOAD RESOURCE (Teacher) ===================== */
export const uploadResource = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ msg: "No file uploaded" });

    const { title, description, category, department, semester, subject } = req.body;
    if (!title)
      return res.status(400).json({ msg: "Title is required" });

    // Determine file type from mimetype
    const mime = req.file.mimetype;
    let fileType;
    if (mime === "application/pdf") {
      fileType = "pdf";
    } else if (mime.startsWith("image/")) {
      fileType = "image";
    } else {
      // Remove the uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ msg: "Only PDFs and images are allowed" });
    }

    const resource = await Resource.create({
      title,
      description: description || "",
      category: category || "Other",
      department: department || req.user.department || "",
      semester: Number(semester) || req.user.semester || 1,
      subject: subject || "",
      fileType,
      fileName: req.file.originalname,
      filePath: req.file.filename,
      teacherId: req.user._id,
    });

    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== GET RESOURCES ===================== */
export const getResources = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "teacher") {
      filter.teacherId = req.user._id;
    } else {
      // Students: Filter by department and semester from query params
      const dept = req.query.department || req.user.department;
      const sem = req.query.semester || req.user.semester;
      
      if (dept) filter.department = dept;
      if (sem) filter.semester = Number(sem);
    }

    const resources = await Resource.find(filter).sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== DELETE RESOURCE (Teacher) ===================== */
export const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ msg: "Resource not found" });

    if (resource.teacherId.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: "Not your resource" });

    // Delete file from disk
    const uploadsDir = path.resolve("uploads");
    const filePath = path.join(uploadsDir, resource.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await resource.deleteOne();
    res.json({ msg: "Resource deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
