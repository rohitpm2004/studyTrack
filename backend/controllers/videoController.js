import Video from "../models/Video.js";

/* ---- Support for YouTube and Google Drive ---- */
const YT_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/;
const DRIVE_REGEX = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/;

function getVideoSource(url) {
  if (YT_REGEX.test(url)) return "youtube";
  if (DRIVE_REGEX.test(url)) return "drive";
  return null;
}

/* ===================== CREATE VIDEO (Teacher) ===================== */
export const createVideo = async (req, res) => {
  try {
    const { title, youtubeUrl, videoUrl, description, duration, department, semester, subject } = req.body;
    const finalUrl = videoUrl || youtubeUrl;

    if (!title || !finalUrl || !department || !semester || !subject)
      return res.status(400).json({ msg: "Required fields: title, videoUrl, department, semester, subject" });

    const source = getVideoSource(finalUrl);
    if (!source)
      return res.status(400).json({ msg: "Invalid video URL. Only YouTube and Google Drive links are supported." });

    const video = await Video.create({
      title,
      description: description || "",
      videoUrl: finalUrl,
      videoSource: source,
      department,
      semester: Number(semester) || 1,
      subject,
      teacherId: req.user._id,
      duration: duration || 0,
    });

    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== GET ALL VIDEOS ===================== */
export const getVideos = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "teacher") {
      filter.teacherId = req.user._id;
    } else {
      const dept = req.query.department || req.user.department;
      const sem = req.query.semester || req.user.semester;
      
      if (dept) filter.department = dept;
      if (sem) filter.semester = Number(sem);
    }

    const videos = await Video.find(filter)
      .populate("teacherId", "name email")
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== GET SINGLE VIDEO ===================== */
export const getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate("teacherId", "name email");
    if (!video) return res.status(404).json({ msg: "Video not found" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/* ===================== UPDATE VIDEO (Teacher) ===================== */
export const updateVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ msg: "Video not found" });

    if (video.teacherId.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: "Not your video" });

    const { title, youtubeUrl, videoUrl, description, duration, department, semester, subject } = req.body;
    const finalUrl = videoUrl || youtubeUrl;

    if (finalUrl !== undefined) {
      const source = getVideoSource(finalUrl);
      if (!source)
        return res.status(400).json({ msg: "Invalid video URL. Only YouTube and Google Drive links are supported." });
      video.videoUrl = finalUrl;
      video.videoSource = source;
    }

    if (title !== undefined) video.title = title;
    if (description !== undefined) video.description = description;
    if (duration !== undefined) video.duration = Number(duration) || 0;
    if (department !== undefined) video.department = department;
    if (semester !== undefined) video.semester = Number(semester) || 1;
    if (subject !== undefined) video.subject = subject;

    await video.save();
    res.json(video);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


/* ===================== DELETE VIDEO (Teacher) ===================== */
export const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ msg: "Video not found" });

    if (video.teacherId.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: "Not your video" });

    await video.deleteOne();
    res.json({ msg: "Video deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
