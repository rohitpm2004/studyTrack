import Progress from "../models/Progress.js";
import Video from "../models/Video.js";
import User from "../models/User.js";
import VideoClick from "../models/VideoClick.js";

/* ===================== HEARTBEAT — Update Progress ===================== */
export const updateProgress = async (req, res) => {
  try {
    const { videoId, lastPosition, delta } = req.body;
    const studentId = req.user._id;

    if (!videoId) return res.status(400).json({ msg: "videoId is required" });

    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ msg: "Video not found" });

    const isDrive = video.videoSource === "drive";
    let progress = await Progress.findOne({ studentId, videoId });

    const safeDelta = Math.max(0, Math.min(delta || 0, 15));
    const pos = Math.max(0, lastPosition || 0);

    if (!progress) {
      progress = await Progress.create({
        studentId,
        videoId,
        watchTime: safeDelta,
        lastPosition: pos,
        maxPosition: pos,
        isCompleted: false,
      });
    } else {
      progress.watchTime += safeDelta;
      // For Drive: cap watchTime at video duration (can't exceed 100%)
      if (isDrive && video.duration > 0) {
        progress.watchTime = Math.min(progress.watchTime, video.duration);
      }
      progress.lastPosition = pos;
      // Only move maxPosition forward (YouTube sends real position; Drive sends 0)
      if (pos > progress.maxPosition) {
        progress.maxPosition = pos;
      }
      await progress.save();
    }

    // Completion check:
    // YouTube → use maxPosition (furthest point reached)
    // Drive   → use watchTime (total time, capped at duration)
    const progressMetric = isDrive ? progress.watchTime : progress.maxPosition;
    if (video.duration > 0 && progressMetric >= video.duration * 0.9) {
      progress.isCompleted = true;
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

    const isDrive = video.videoSource === "drive";

    const analytics = progressList
      .filter((p) => p.studentId?.role === "student")
      .map((p) => {
      const metric = isDrive ? p.watchTime : (p.maxPosition || 0);
      return {
      studentName: p.studentId?.name || "Unknown",
      studentEmail: p.studentId?.email || "",
      group: p.studentId?.group || "",
      collegeName: p.studentId?.collegeName || "",
      department: p.studentId?.department || "",
      watchTime: p.watchTime,
      maxPosition: p.maxPosition || 0,
      completionPercent:
        video.duration > 0
          ? Math.min(100, Math.round((metric / video.duration) * 100))
          : 0,
      isCompleted: p.isCompleted,
    }});

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

    const isDriveV = video.videoSource === "drive";
    for (const p of progressList) {
      if (p.studentId?.role !== "student") continue;
      const metric = isDriveV ? p.watchTime : (p.maxPosition || 0);
      const pct =
        video.duration > 0
          ? Math.min(100, Math.round((metric / video.duration) * 100))
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

/* ===================== STUDENT: Record Video Click ===================== */
export const recordVideoClick = async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ msg: "videoId is required" });

    const click = await VideoClick.create({
      studentId: req.user._id,
      videoId,
    });
    res.status(201).json(click);
  } catch (err) {
    console.error("Video click record error:", err);
    res.status(500).json({ msg: "Failed to record click" });
  }
};

/* ===================== TEACHER: Export Video Clicks CSV ===================== */
export const exportClicksCSV = async (req, res) => {
  try {
    if (req.user.role !== "teacher")
      return res.status(403).json({ msg: "Teachers only" });

    const { videoId } = req.params;
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ msg: "Video not found" });

    const clicks = await VideoClick.find({ videoId })
      .populate("studentId", "name email group collegeName department role")
      .sort({ clickedAt: -1 });

    let csv = "Video Name,Name,Email,Dept,Group,College,Clicked At,Total Clicks\n";

    // Group clicks by student to show total clicks per student
    const studentClicks = {};
    for (const c of clicks) {
      if (c.studentId?.role !== "student") continue;
      const sid = c.studentId._id.toString();
      if (!studentClicks[sid]) {
        studentClicks[sid] = {
          name: c.studentId.name || "",
          email: c.studentId.email || "",
          dept: c.studentId.department || "",
          group: c.studentId.group || "",
          college: c.studentId.collegeName || "",
          firstClick: c.clickedAt,
          lastClick: c.clickedAt,
          count: 0,
        };
      }
      studentClicks[sid].count += 1;
      if (c.clickedAt < studentClicks[sid].firstClick) studentClicks[sid].firstClick = c.clickedAt;
      if (c.clickedAt > studentClicks[sid].lastClick) studentClicks[sid].lastClick = c.clickedAt;
    }

    for (const s of Object.values(studentClicks)) {
      csv += `"${video.title}","${s.name}","${s.email}","${s.dept}","${s.group}","${s.college}","${new Date(s.lastClick).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}",${s.count}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${video.title}-clicks.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== TEACHER: Export ALL Videos Clicks CSV ===================== */
export const exportAllClicksCSV = async (req, res) => {
  try {
    if (req.user.role !== "teacher")
      return res.status(403).json({ msg: "Teachers only" });

    // Get all videos by this teacher
    const videos = await Video.find({ teacherId: req.user._id });
    const videoIds = videos.map((v) => v._id);
    const videoMap = {};
    videos.forEach((v) => { videoMap[v._id.toString()] = v.title; });

    // Get all clicks across all teacher's videos
    const clicks = await VideoClick.find({ videoId: { $in: videoIds } })
      .populate("studentId", "name email group collegeName department role")
      .sort({ clickedAt: -1 });

    // Group by student → video
    const studentMap = {};
    for (const c of clicks) {
      if (c.studentId?.role !== "student") continue;
      const sid = c.studentId._id.toString();
      const vid = c.videoId.toString();

      if (!studentMap[sid]) {
        studentMap[sid] = {
          name: c.studentId.name || "",
          email: c.studentId.email || "",
          dept: c.studentId.department || "",
          group: c.studentId.group || "",
          college: c.studentId.collegeName || "",
          videos: {},  // videoId -> { title, count, lastClick }
        };
      }

      if (!studentMap[sid].videos[vid]) {
        studentMap[sid].videos[vid] = {
          title: videoMap[vid] || "Unknown",
          count: 0,
          lastClick: c.clickedAt,
        };
      }
      studentMap[sid].videos[vid].count += 1;
      if (c.clickedAt > studentMap[sid].videos[vid].lastClick) {
        studentMap[sid].videos[vid].lastClick = c.clickedAt;
      }
    }

    let csv = "Name,Email,Dept,Group,College,Video Names,Total Clicks,Most Recent Click,Total Videos Clicked\n";

    for (const s of Object.values(studentMap)) {
      const videoEntries = Object.values(s.videos);
      const totalVideos = videoEntries.length;

      if (totalVideos === 0) continue;

      const videoNames = videoEntries.map((v) => v.title).join(", ");
      const totalClicks = videoEntries.reduce((sum, v) => sum + v.count, 0);
      const mostRecentClick = new Date(Math.max(...videoEntries.map((v) => new Date(v.lastClick))));

      csv += `"${s.name}","${s.email}","${s.dept}","${s.group}","${s.college}","${videoNames}",${totalClicks},"${mostRecentClick.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}",${totalVideos}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="All-Videos-Clicks.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
