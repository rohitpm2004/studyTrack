import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { FileText, Image as ImageIcon, Download, Eye, Search } from "lucide-react";
import { DEPARTMENTS } from "../constants";

const CATEGORIES = ["Question Paper", "Records", "Assignment", "Other"];

export default function StudentResources() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  // Open Access: Filter by Choice
  const [selectedDept, setSelectedDept] = useState(user?.department || "Computer Science");
  const [selectedSem, setSelectedSem] = useState(user?.semester || 1);

  useEffect(() => {
    setLoading(true);
    API.get(`/resources?department=${selectedDept}&semester=${selectedSem}`)
      .then((res) => setResources(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDept, selectedSem]);

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const matchesSearch = 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 2 }}>
              <h2 style={{ margin: 0 }}>Resources</h2>
              <div style={{ 
                fontSize: "0.72rem", 
                fontWeight: 700, 
                color: "var(--primary)", 
                background: "var(--primary-light)", 
                padding: "4px 12px", 
                borderRadius: "100px",
                border: "1px solid var(--primary-glow)",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                My Profile: {user?.department}
              </div>
            </div>
            <p>Viewing <strong>{selectedDept}</strong> • Semester <strong>{selectedSem}</strong></p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <select 
              className="header-select" 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
              <option value="Other">Other</option>
            </select>

            <select 
              className="header-select" 
              style={{ minWidth: "100px" }}
              value={selectedSem}
              onChange={(e) => setSelectedSem(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map(s => (
                <option key={s} value={s}>Sem {s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Search and Filters */}
        <div className="toolbar" style={{ flexWrap: "wrap", gap: 15, marginBottom: 20 }}>
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
        </div>

        {/* Filter Tabs */}
        <div className="tab-group" style={{ marginBottom: 25 }}>
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

        {filteredResources.length === 0 ? (
          <div className="empty-state">
            <FileText />
            <p>
              {searchQuery || selectedFilter !== "All" 
                ? "No matching resources found." 
                : "No resources available yet."}
            </p>
          </div>
        ) : (
          <div className="video-grid">
            {filteredResources.map((r, i) => (
              <div
                key={r._id}
                className="video-card"
                style={{ cursor: "default", animationDelay: `${i * 60}ms` }}
              >
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
                  {/* Category Badge */}
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
                    {r.category || "Other"}
                  </div>
                </div>
                <div className="video-card-body">
                  <div className="video-card-title">{r.title}</div>
                  <div className="video-card-meta">
                    {r.fileType === "pdf" ? "PDF" : "Image"} • {new Date(r.createdAt).toLocaleDateString()}
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
                      <Eye size={14} /> View
                    </a>
                    <a
                      href={`/uploads/${r.filePath}`}
                      download={r.fileName}
                      className="btn btn-outline btn-sm"
                    >
                      <Download size={14} /> Download
                    </a>
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
