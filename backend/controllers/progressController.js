import Progress from "../models/Progress.js";
import Video from "../models/Video.js";
import User from "../models/User.js";

/* ===================== HEARTBEAT — Update Progress ===================== */
export const updateProgress = async (req, res) => {
  try {
    const { videoId, lastPosition, watchTime } = req.body;
    const studentId = req.user._id;

    if (!videoId) return res.status(400).json({ msg: "videoId is required" });

    // find the video to get duration for completion check
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ msg: "Video not found" });

    const isCompleted =
      video.duration > 0 && watchTime >= video.duration * 0.9;

    let progress = await Progress.findOne({ studentId, videoId });

    if (!progress) {
      progress = await Progress.create({
        studentId,
        videoId,
        watchTime: watchTime || 0,
        lastPosition: lastPosition || 0,
        isCompleted,
      });
    } else {
      progress.watchTime = Math.max(progress.watchTime, watchTime || 0);
      progress.lastPosition = lastPosition || 0;
      if (isCompleted) progress.isCompleted = true;
      await progress.save();
    }

    res.json(progress);
  } catch (err) {
    console.error("Progress update error:", err);
    res.status(500).json({ msg: "Progress update failed" });
  }
};

/* ===================== GET MY PROGRESS for a Video ===================== */
export const getMyProgress = async (req, res) => {
  try {
    const progress = await Progress.findOne({
      studentId: req.user._id,
      videoId: req.params.videoId,
    });
    res.json(progress || { watchTime: 0, lastPosition: 0, isCompleted: false });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== GET ALL MY PROGRESS (Student Dashboard) ===================== */
export const getAllMyProgress = async (req, res) => {
  try {
    const progressList = await Progress.find({ studentId: req.user._id });
    res.json(progressList);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== TEACHER: Analytics for a Video ===================== */
export const getVideoAnalytics = async (req, res) => {
  try {
    if (req.user.role !== "teacher")
      return res.status(403).json({ msg: "Teachers only" });

    const { videoId } = req.params;
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ msg: "Video not found" });

    const progressList = await Progress.find({ videoId }).populate(
      "studentId",
      "name email group collegeName role department"
    );

    const analytics = progressList
      .filter((p) => p.studentId?.role === "student")
      .map((p) => ({
      studentName: p.studentId?.name || "Unknown",
      studentEmail: p.studentId?.email || "",
      group: p.studentId?.group || "",
      collegeName: p.studentId?.collegeName || "",
      department: p.studentId?.department || "",
      watchTime: p.watchTime,
      completionPercent:
        video.duration > 0
          ? Math.min(100, Math.round((p.watchTime / video.duration) * 100))
          : 0,
      isCompleted: p.isCompleted,
    }));

    res.json({ video: { title: video.title, duration: video.duration }, analytics });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== TEACHER: Classroom Overview ===================== */
export const getClassroomAnalytics = async (req, res) => {
  try {
    if (req.user.role !== "teacher")
      return res.status(403).json({ msg: "Teachers only" });

    // get all videos by this teacher
    const videos = await Video.find({ teacherId: req.user._id });
    const videoIds = videos.map((v) => v._id);

    const progressList = await Progress.find({ videoId: { $in: videoIds } }).populate(
      "studentId",
      "name email group collegeName role department"
    );

    // group by student (exclude teachers)
    const studentMap = {};
    for (const p of progressList) {
      const sid = p.studentId?._id?.toString();
      if (!sid) continue;
      if (p.studentId.role !== "student") continue;
      if (!studentMap[sid]) {
        studentMap[sid] = {
          studentName: p.studentId.name,
          studentEmail: p.studentId.email,
          group: p.studentId.group || "",
          collegeName: p.studentId.collegeName || "",
          department: p.studentId.department || "",
          totalWatchTime: 0,
          videosCompleted: 0,
          totalVideos: videos.length,
        };
      }
      studentMap[sid].totalWatchTime += p.watchTime;
      if (p.isCompleted) studentMap[sid].videosCompleted += 1;
    }

    const result = Object.values(studentMap).map((s) => ({
      ...s,
      completionPercent:
        s.totalVideos > 0
          ? Math.round((s.videosCompleted / s.totalVideos) * 100)
          : 0,
    }));

    // sort by group then name
    result.sort((a, b) => a.group.localeCompare(b.group) || a.studentName.localeCompare(b.studentName));

    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== TEACHER: Export CSV ===================== */
export const exportCSV = async (req, res) => {
  try {
    if (req.user.role !== "teacher")
      return res.status(403).json({ msg: "Teachers only" });

    const { videoId } = req.params;
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ msg: "Video not found" });

    const progressList = await Progress.find({ videoId }).populate(
      "studentId",
      "name email group collegeName role department"
    );

    let csv = "Name,Email,Dept,Group,College,Watch Time (s),Completion %,Completed\n";

    for (const p of progressList) {
      if (p.studentId?.role !== "student") continue;
      const pct =
        video.duration > 0
          ? Math.min(100, Math.round((p.watchTime / video.duration) * 100))
          : 0;
      csv += `"${p.studentId?.name || ""}","${p.studentId?.email || ""}","${
        p.studentId?.department || ""
      }","${
        p.studentId?.group || ""
      }","${p.studentId?.collegeName || ""}",${p.watchTime},${pct},${
        p.isCompleted ? "Yes" : "No"
      }\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${video.title}-attendance.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== TEACHER: Export Classroom Overview CSV ===================== */
export const exportClassroomCSV = async (req, res) => {
  try {
    if (req.user.role !== "teacher")
      return res.status(403).json({ msg: "Teachers only" });

    const videos = await Video.find({ teacherId: req.user._id });
    const videoIds = videos.map((v) => v._id);

    const progressList = await Progress.find({ videoId: { $in: videoIds } })
      .populate("studentId", "name email group role department collegeName")
      .populate("videoId", "title");

    const studentMap = {};
    for (const p of progressList) {
      if (p.studentId?.role !== "student") continue;
      const sid = p.studentId?._id?.toString();
      if (!sid) continue;

      if (!studentMap[sid]) {
        studentMap[sid] = {
          name: p.studentId.name,
          email: p.studentId.email,
          dept: p.studentId.department || "-",
          college: p.studentId.collegeName || "-",
          group: p.studentId.group || "-",
          totalWatchTime: 0,
          videosCompleted: 0,
          watchedLectures: new Set(),
        };
      }
      studentMap[sid].totalWatchTime += p.watchTime;
      if (p.isCompleted) studentMap[sid].videosCompleted += 1;
      if (p.videoId?.title) studentMap[sid].watchedLectures.add(p.videoId.title);
    }

    let csv = "Name,Email,Dept,College,Group,Total Watch Time (s),Videos Completed,Completion %,Watched Lectures\n";
    for (const s of Object.values(studentMap)) {
      const pct = videos.length > 0 ? Math.round((s.videosCompleted / videos.length) * 100) : 0;
      const lectures = Array.from(s.watchedLectures).join(" | ");
      csv += `"${s.name}","${s.email}","${s.dept}","${s.college}","${s.group}",${s.totalWatchTime},${s.videosCompleted},${pct},"${lectures}"\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="Classroom-Overview.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
