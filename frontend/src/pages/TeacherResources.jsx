import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { Upload, Trash2, FileText, Image as ImageIcon, X, Plus, Search, Filter } from "lucide-react";
import { DEPARTMENTS } from "../constants";

const CATEGORIES = ["Question Paper", "Records", "Assignment", "Other"];

export default function TeacherResources() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [file, setFile] = useState(null);
  const [dept, setDept] = useState(user?.department || "");
  const [sem, setSem] = useState(user?.semester || 1);
  const [subject, setSubject] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const loadResources = async () => {
    try {
      const { data } = await API.get("/resources");
      setResources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadResources(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("department", dept);
      formData.append("semester", sem);
      formData.append("subject", subject);

      await API.post("/resources", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setTitle("");
      setDescription("");
      setCategory("Other");
      setSubject("");
      setFile(null);
      setShowForm(false);
      loadResources();
    } catch (err) {
      alert(err.response?.data?.msg || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this resource?")) return;
    try {
      await API.delete(`/resources/${id}`);
      loadResources();
    } catch (err) {
      alert(err.response?.data?.msg || "Delete failed");
    }
  };

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const matchesSearch = 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === "All" || r.category === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [resources, searchQuery, selectedFilter]);

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading resources…</span>
      </div>
    );

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Resources</h2>
            <p>Share PDFs and images with your students</p>
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
        {/* Toolbar */}
        <div className="toolbar" style={{ flexWrap: "wrap", gap: 15 }}>
          <div className="toolbar-left" style={{ flex: 1, minWidth: 280 }}>
            <div style={{ position: "relative" }}>
              <Search 
                size={18} 
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} 
              />
              <input 
                type="text"
                className="form-input"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 40, width: "100%", maxWidth: 400 }}
              />
            </div>
          </div>
          <div className="toolbar-right" style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Resource</>}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="tab-group" style={{ marginBottom: 20 }}>
          <button 
            className={`tab-btn ${selectedFilter === "All" ? "active" : ""}`}
            onClick={() => setSelectedFilter("All")}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              className={`tab-btn ${selectedFilter === cat ? "active" : ""}`}
              onClick={() => setSelectedFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Upload Form */}
        {showForm && (
          <div className="add-video-form" style={{ marginBottom: 30 }}>
            <h3><Upload size={20} /> Upload Resource</h3>
            <form onSubmit={handleUpload}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Chapter 1 Notes"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Operating Systems"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-input" value={dept} onChange={(e) => setDept(e.target.value)} required>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Semester</label>
                  <select className="form-input" value={sem} onChange={(e) => setSem(Number(e.target.value))} required>
                    {[1, 2, 3, 4, 5, 6].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ visibility: "hidden" }}>
                   {/* Placeholder for layout balance */}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="form-input"
                  placeholder="Brief description…"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">File (PDF or Image, max 10 MB)</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="form-input"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                  style={{ padding: 10 }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={uploading}>
                <Upload size={16} /> {uploading ? "Uploading…" : "Upload"}
              </button>
            </form>
          </div>
        )}

        {/* Resource Grid */}
        {filteredResources.length === 0 ? (
          <div className="empty-state">
            <FileText />
            <p>
              {searchQuery || selectedFilter !== "All" 
                ? "No matching resources found." 
                : "No resources yet. Upload your first one!"}
            </p>
          </div>
        ) : (
          <div className="video-grid">
            {filteredResources.map((r) => (
              <div key={r._id} className="video-card" style={{ cursor: "default" }}>
                <div
                  className="video-card-thumb"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: r.fileType === "pdf" ? "linear-gradient(135deg, #ef4444, #dc2626)" : "var(--bg-card)",
                  }}
                >
                  {r.fileType === "pdf" ? (
                    <FileText size={48} color="#fff" />
                  ) : (
                    <img
                      src={`/uploads/${r.filePath}`}
                      alt={r.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  {/* Category Badge on Thumb */}
                  <div style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(4px)",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    zIndex: 1
                  }}>
                    {r.category}
                  </div>
                </div>
                <div className="video-card-body">
                  <div className="video-card-title">{r.title}</div>
                  <div className="video-card-meta">
                    {r.fileType === "pdf" ? "PDF" : "Image"} • {r.fileName}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600, marginTop: 4 }}>
                    {r.subject} • Sem {r.semester}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {r.department}
                  </div>
                  {r.description && (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 4 }}>
                      {r.description}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <a
                      href={`/uploads/${r.filePath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm"
                    >
                      View
                    </a>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r._id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
