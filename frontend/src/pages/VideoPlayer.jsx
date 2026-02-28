import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Play, 
  Pause, 
  MessageSquare, 
  Bookmark, 
  Send, 
  Trash2, 
  ChevronRight 
} from "lucide-react";

/* Extract Video Info */
function getVideoInfo(url) {
  if (!url) return { id: null, type: null };
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { id: ytMatch[1], type: "youtube" };
  
  const driveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/);
  if (driveMatch) return { id: driveMatch[1], type: "drive" };

  return { id: null, type: null };
}

/* Load the YouTube IFrame API script (once) */
let apiReady = !!window.YT?.Player;
function loadYTApi() {
  return new Promise((resolve) => {
    if (apiReady) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      if (prev) prev();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

export default function VideoPlayer({ mode = "student" }) {
  const { user } = useAuth();
  const isTeacher = mode === "teacher";
  const { id } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [progress, setProgress] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [seeked, setSeeked] = useState(false);
  const [videoSource, setVideoSource] = useState({ id: null, type: null });

  // Features State
  const [activeTab, setActiveTab] = useState("discussion");
  const [comments, setComments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [loadingFeatures, setLoadingFeatures] = useState(true);

  const deltaRef = useRef(0);
  const intervalRef = useRef(null);
  const clickRecordedRef = useRef(false);
  const [sessionTime, setSessionTime] = useState(0);

  /* ---- Load Data ---- */
  const loadVideoData = useCallback(async () => {
    try {
      const vRes = await API.get(`/videos/${id}`);
      setVideo(vRes.data);
      setVideoSource(getVideoInfo(vRes.data.videoUrl || vRes.data.youtubeUrl));

      if (!isTeacher) {
        const pRes = await API.get(`/progress/me/${id}`);
        setProgress(pRes.data);

        // Record video click (only once per page load)
        if (!clickRecordedRef.current) {
          clickRecordedRef.current = true;
          API.post("/progress/click", { videoId: id }).catch(() => {});
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [id, isTeacher]);

  const loadFeatures = useCallback(async () => {
    setLoadingFeatures(true);
    try {
      const [cRes, nRes] = await Promise.all([
        API.get(`/comments/${id}`),
        isTeacher ? Promise.resolve({ data: [] }) : API.get(`/notes/${id}`)
      ]);
      setComments(cRes.data);
      if (!isTeacher) setNotes(nRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFeatures(false);
    }
  }, [id, isTeacher]);

  useEffect(() => {
    loadVideoData();
    loadFeatures();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadVideoData, loadFeatures]);

  /* ---- Player Creation ---- */
  useEffect(() => {
    if (!video || !videoSource.id) return;

    if (videoSource.type === "youtube") {
      let destroyed = false;
      loadYTApi().then(() => {
        if (destroyed) return;
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: videoSource.id,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: (e) => {
              if (progress?.lastPosition > 0 && !seeked) {
                e.target.seekTo(progress.lastPosition, true);
                setSeeked(true);
              }
            },
            onStateChange: (e) => {
              const state = e.data;
              if (state === 1) setPlaying(true);
              else if (state === 2 || state === 0) {
                setPlaying(false);
                sendHeartbeatNow();
              }
            },
          },
        });
      });

      return () => {
        destroyed = true;
        if (playerRef.current?.destroy) {
          try { playerRef.current.destroy(); } catch { /* ignore */ }
        }
      };
    } else if (videoSource.type === "drive") {
      // For Google Drive, we start in PAUSED state.
      // It will toggle to "Tracking" as soon as the student clicks the video to play it.
      setPlaying(false);
      return () => setPlaying(false);
    }
  }, [video, videoSource]);





  /* ---- Handlers ---- */
  const sendHeartbeatNow = useCallback(async (secondsToSend) => {
    const player = playerRef.current;
    if (!video || isTeacher) return;
    
    let currentTime = 0;
    if (videoSource.type === "youtube") {
      if (!player?.getCurrentTime) return;
      currentTime = player.getCurrentTime() || 0;
    } else {
      // For Drive, we just track watch time, we don't have precise current position
      currentTime = 0; 
    }

    const delta = secondsToSend ?? deltaRef.current;
    deltaRef.current = 0; // reset after capturing

    try {
      const { data } = await API.post("/progress/update", {
        videoId: video._id,
        lastPosition: Math.floor(currentTime),
        delta,
      });
      setProgress(data);
    } catch (err) {
      console.error("Heartbeat error:", err);
    }
  }, [video, isTeacher, videoSource]);

  const sendHeartbeat = useCallback(async () => {
    deltaRef.current = 30;
    setSessionTime(prev => prev + 30);
    await sendHeartbeatNow();
  }, [sendHeartbeatNow]);

  useEffect(() => {
    if (playing && !isTeacher) {
      intervalRef.current = setInterval(sendHeartbeat, 30_000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, isTeacher, sendHeartbeat]);

  /* Smart Tracking for Google Drive: Auto-pause when tab is inactive */
  const wasPlayingRef = useRef(false);
  const playingRef = useRef(playing);
  
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    if (videoSource.type !== "drive" || isTeacher) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (playingRef.current) {
          wasPlayingRef.current = true;
          setPlaying(false);
        } else {
          wasPlayingRef.current = false;
        }
      } else {
        // Tab became visible again
        if (wasPlayingRef.current) {
          setPlaying(true);
        }
      }
    };

    const handleWindowBlur = () => {
      if (document.hidden) return;

      setTimeout(() => {
        if (document.activeElement?.tagName === "IFRAME") {
          setPlaying(prev => !prev);
          window.focus();
        }
      }, 150);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [videoSource, isTeacher]);





  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { data } = await API.post("/comments", { 
        videoId: id, 
        text: commentText 
      });
      setComments([...comments, data]);
      setCommentText("");
    } catch (err) {
      alert("Failed to post comment");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await API.delete(`/comments/${commentId}`);
      setComments(comments.filter(c => c._id !== commentId));
    } catch (err) {
      alert("Failed to delete comment");
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    
    const player = playerRef.current;
    const timestamp = player?.getCurrentTime ? player.getCurrentTime() : 0;

    try {
      const { data } = await API.post("/notes", {
        videoId: id,
        text: noteText,
        videoTimestamp: timestamp
      });
      setNotes([...notes, data].sort((a,b) => a.videoTimestamp - b.videoTimestamp));
      setNoteText("");
    } catch (err) {
      alert("Failed to save note");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Delete this note?")) return;
    try {
      await API.delete(`/notes/${noteId}`);
      setNotes(notes.filter(n => n._id !== noteId));
    } catch (err) {
      alert("Failed to delete note");
    }
  };

  const seekToTime = (seconds) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
    }
  };

  const formatTime = (s) => {
    if (!s) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!video)
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading video…</span>
      </div>
    );

  // YouTube: use maxPosition (furthest point); Drive: use watchTime (capped at duration on backend)
  const progressMetric = videoSource.type === "drive"
    ? (progress?.watchTime || 0)
    : (progress?.maxPosition || 0);
  const pct = video.duration > 0 ? Math.min(100, Math.round((progressMetric / video.duration) * 100)) : 0;

  return (
    <>
      <div className="page-header">
        <div className="header-content">
          <div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate(isTeacher ? "/teacher" : "/student")}
              style={{ marginBottom: 14 }}
            >
              <ArrowLeft size={16} /> Back to {isTeacher ? "Dashboard" : "Lectures"}
            </button>
            <h2>{video.title}</h2>
            <p>{video.description || "No description"}</p>
          </div>
          <div className="profile-badge" style={{ marginTop: 40 }}>
            {user?.department}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="player-container">
          {/* Main Content: Player + Stats */}
          <div className="player-main">
            <div className="player-wrapper">
              {videoSource.type === "youtube" ? (
                <div
                  ref={containerRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                  }}
                />
              ) : videoSource.type === "drive" ? (
                <iframe
                  src={`https://drive.google.com/file/d/${videoSource.id}/preview`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none"
                  }}
                  allow="autoplay"
                  title={video.title}
                />
              ) : (
                <div className="empty-state">Unsupported Video Source</div>
              )}
            </div>

            <div className="player-info" style={{ marginTop: 24 }}>
              {!isTeacher && (
                <div className="progress-bar-container" style={{ marginBottom: 16 }}>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${progress?.isCompleted ? "completed" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="progress-label">{pct}% Watched</span>
                </div>
              )}

              <div className="player-status">
                <span className="player-meta-item">
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                  {playing ? (videoSource.type === "drive" ? "Auto-tracking active..." : "Playing") : (videoSource.type === "drive" ? "Auto-tracking paused" : "Paused")}
                </span>






                {!isTeacher && (
                  <span className="player-meta-item">
                    <Clock size={16} />
                    Watch time: {formatTime(sessionTime)}
                  </span>
                )}

                {video.duration > 0 && (
                  <span className="player-meta-item">
                    <Clock size={14} />
                    Duration: {formatTime(video.duration)}
                  </span>
                )}

                {progress?.isCompleted && (
                  <span className="badge badge-success">
                    <CheckCircle2 size={14} /> Completed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Discussion & Notes */}
          <div className="player-sidebar">
            <div className="sidebar-tabs">
              <button 
                className={`sidebar-tab-btn ${activeTab === "discussion" ? "active" : ""}`}
                onClick={() => setActiveTab("discussion")}
              >
                <MessageSquare size={16} /> Discussion
              </button>
              {!isTeacher && (
                <button 
                  className={`sidebar-tab-btn ${activeTab === "notes" ? "active" : ""}`}
                  onClick={() => setActiveTab("notes")}
                >
                  <Bookmark size={16} /> Notes
                </button>
              )}
            </div>

            <div className="sidebar-content">
              {activeTab === "discussion" && (
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <div className="empty-state" style={{ padding: 0, minHeight: 100 }}>
                      <p style={{ fontSize: "0.85rem" }}>No comments yet. Be the first to ask!</p>
                    </div>
                  ) : (
                    comments.map(c => (
                      <div key={c._id} className="comment-item">
                        <div className="comment-header">
                          <span className="comment-user">
                            {c.userId?.name} {c.userId?.role === "teacher" && <span className="badge badge-primary" style={{ padding: "2px 6px", fontSize: "0.6rem" }}>Teacher</span>}
                          </span>
                          <span className="comment-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="comment-text">
                          {c.text}
                          <div style={{ position: "absolute", right: 8, bottom: 8 }}>
                            {(isTeacher || (API.getUserId && c.userId?._id === API.getUserId())) && (
                              <Trash2 
                                size={14} 
                                className="comment-delete" 
                                onClick={() => handleDeleteComment(c._id)} 
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "notes" && !isTeacher && (
                <div className="notes-list">
                  {notes.length === 0 ? (
                    <div className="empty-state" style={{ padding: 0, minHeight: 100 }}>
                      <p style={{ fontSize: "0.85rem" }}>No notes saved for this video.</p>
                    </div>
                  ) : (
                    notes.map(n => (
                      <div key={n._id} className="note-item">
                        <div className="note-header">
                          <span className="note-time" onClick={() => seekToTime(n.videoTimestamp)}>
                            {formatTime(n.videoTimestamp)}
                          </span>
                          <Trash2 
                            size={14} 
                            style={{ cursor: "pointer", color: "var(--text-muted)" }} 
                            onClick={() => handleDeleteNote(n._id)} 
                          />
                        </div>
                        <div className="note-content">{n.text}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="sidebar-input-area">
              {activeTab === "discussion" ? (
                <form className="sidebar-form" onSubmit={handleAddComment}>
                  <textarea 
                    className="form-input sidebar-textarea"
                    placeholder="Ask a question..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm btn-block">
                    <Send size={14} /> Post Comment
                  </button>
                </form>
              ) : (
                <form className="sidebar-form" onSubmit={handleAddNote}>
                  <textarea 
                    className="form-input sidebar-textarea"
                    placeholder="Take a note at current time..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm btn-block">
                    <Bookmark size={14} /> Save Note
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
