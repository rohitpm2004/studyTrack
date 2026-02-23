import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { Plus, Trash2, Video as VideoIcon, Users, Clock, X, Link as LinkIcon, Play, Copy, Check, Pencil } from "lucide-react";
import { DEPARTMENTS } from "../constants";

/* Helper: extract YouTube video ID for thumbnail */
function getYouTubeId(url) {
  const m = url?.match(/(?:youtu\.be\/|v=|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const EMPTY_FORM = { 
  title: "", 
  description: "", 
  youtubeUrl: "", 
  duration: "",
  department: "",
  semester: 1,
  subject: ""
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null); // null = add mode, object = edit mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [classroomCount, setClassroomCount] = useState(0);


  const loadVideos = async () => {
    try {
      const { data } = await API.get("/videos");
      setVideos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
    API.get("/progress/analytics/classroom")
      .then((res) => setClassroomCount(res.data.length))
      .catch(() => {});
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const openAddForm = () => {
    setEditingVideo(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (v) => {
    setEditingVideo(v);
    setForm({
      title: v.title,
      description: v.description || "",
      youtubeUrl: v.youtubeUrl,
      duration: v.duration ? String(Math.round(v.duration / 60)) : "",
      department: v.department || "",
      semester: v.semester || 1,
      subject: v.subject || ""
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingVideo(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        duration: (Number(form.duration) || 0) * 60,
      };
      if (editingVideo) {
        await API.put(`/videos/${editingVideo._id}`, payload);
      } else {
        await API.post("/videos", payload);
      }
      closeForm();
      loadVideos();
    } catch (err) {
      setFormError(err.response?.data?.msg || "Failed to save video");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this video? This cannot be undone.")) return;
    try {
      await API.delete(`/videos/${id}`);
      setVideos(videos.filter((v) => v._id !== id));
    } catch (err) {
      alert(err.response?.data?.msg || "Delete failed");
    }
  };

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    );

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Teacher Dashboard</h2>
            <p>Manage lectures and track student engagement</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ 
              fontSize: "0.85rem", 
              fontWeight: 700, 
              color: "var(--primary)", 
              background: "var(--primary-light)", 
              padding: "8px 20px", 
              borderRadius: "100px",
              border: "1px solid var(--primary-glow)",
              boxShadow: "var(--shadow-sm)"
            }}>
              {user?.department}
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon purple"><VideoIcon size={22} /></div>
            <div>
              <div className="stat-value">{videos.length}</div>
              <div className="stat-label">Total Lectures</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><Users size={22} /></div>
            <div>
              <div className="stat-value">{classroomCount}</div>
              <div className="stat-label">Active Students</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><Clock size={22} /></div>
            <div>
              <div className="stat-value">
                {videos.reduce((a, v) => a + (v.duration || 0), 0) > 0
                  ? (() => {
                      const total = videos.reduce((a, v) => a + (v.duration || 0), 0);
                      const h = Math.floor(total / 3600);
                      const m = Math.floor((total % 3600) / 60);
                      return h > 0 ? `${h}h ${m}m` : `${m}m`;
                    })()
                  : "0m"}
              </div>
              <div className="stat-label">Total Content</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Your Lectures</h3>
          </div>
          <div className="toolbar-right">
            <button className="btn btn-primary btn-sm" onClick={showForm ? closeForm : openAddForm}>
              {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Lecture</>}
            </button>
          </div>
        </div>

        {/* Add / Edit Video Form */}
        {showForm && (
          <div className="add-video-form">
            <h3><VideoIcon size={20} /> {editingVideo ? "Edit Lecture" : "Add New Lecture"}</h3>
            {formError && (
              <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.9rem" }}>
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Introduction to React Hooks"
                    value={form.title}
                    onChange={set("title")}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Web Development"
                    value={form.subject}
                    onChange={set("subject")}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-input" value={form.department} onChange={set("department")} required>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Semester</label>
                  <select className="form-input" value={form.semester} onChange={set("semester")} required>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (min)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 30"
                    value={form.duration}
                    onChange={set("duration")}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">YouTube URL</label>
                <div style={{ position: "relative" }}>
                  <LinkIcon
                    size={18}
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
                  />
                  <input
                    className="form-input"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={form.youtubeUrl}
                    onChange={set("youtubeUrl")}
                    required
                    style={{ paddingLeft: 42 }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="What this lecture covers…"
                  value={form.description}
                  onChange={set("description")}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (editingVideo ? "Saving…" : "Adding…") : (editingVideo ? "Save Changes" : "Add Lecture")}
              </button>
            </form>
          </div>
        )}

        {/* Video List */}
        {videos.length === 0 ? (
          <div className="empty-state">
            <VideoIcon />
            <p>No lectures yet. Add your first one!</p>
          </div>
        ) : (
          <div className="video-grid">
            {videos.map((v) => {
              const ytId = getYouTubeId(v.youtubeUrl);
              return (
                <div key={v._id} className="video-card" style={{ cursor: "default" }}>
                  <div className="video-card-thumb">
                    {ytId && <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={v.title} />}
                  </div>
                  <div className="video-card-body">
                    <div className="video-card-title">{v.title}</div>
                    <div className="video-card-meta">
                      <span className="badge badge-primary" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>{v.subject}</span>
                      {v.duration ? `${Math.round(v.duration / 60)} min` : "—"} • {new Date(v.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/teacher/watch/${v._id}`)}>
                        <Play size={14} /> Watch
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => openEditForm(v)}>
                        <Pencil size={14} /> Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v._id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
