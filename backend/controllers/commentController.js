import Comment from "../models/Comment.js";

export const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ videoId: req.params.videoId })
      .populate("userId", "name role")
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { videoId, text } = req.body;
    if (!text) return res.status(400).json({ msg: "Comment text is required" });

    const comment = await Comment.create({
      videoId,
      userId: req.user._id,
      text,
    });

    const populatedComment = await comment.populate("userId", "name role");
    res.status(201).json(populatedComment);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ msg: "Comment not found" });

    // Allow user to delete their own comment, or teacher to delete any comment
    const isAdminOrOwner = 
      req.user.role === "teacher" || 
      comment.userId.toString() === req.user._id.toString();

    if (!isAdminOrOwner) {
      return res.status(403).json({ msg: "Not authorized to delete this comment" });
    }

    await comment.deleteOne();
    res.json({ msg: "Comment removed" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
