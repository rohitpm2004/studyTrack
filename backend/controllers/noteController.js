import Note from "../models/Note.js";

export const getMyNotes = async (req, res) => {
  try {
    const notes = await Note.find({ 
      videoId: req.params.videoId, 
      userId: req.user._id 
    }).sort({ videoTimestamp: 1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const addNote = async (req, res) => {
  try {
    const { videoId, text, videoTimestamp } = req.body;
    if (!text) return res.status(400).json({ msg: "Note text is required" });

    const note = await Note.create({
      videoId,
      userId: req.user._id,
      text,
      videoTimestamp: Math.floor(videoTimestamp || 0),
    });

    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ msg: "Note not found" });

    if (note.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Not your note" });
    }

    await note.deleteOne();
    res.json({ msg: "Note removed" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
