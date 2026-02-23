import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { Play, BookOpen, Search, Clock } from "lucide-react";
import { DEPARTMENTS } from "../constants";

/* Helper: extract YouTube video ID for thumbnail */
function getYouTubeId(url) {
  const m = url?.match(/(?:youtu\.be\/|v=|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Open Access: Filter by Choice (defaults to user profile)
  const [selectedDept, setSelectedDept] = useState(user?.department || "Computer Science");
  const [selectedSem, setSelectedSem] = useState(user?.semester || 1);
  
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vRes, pRes] = await Promise.all([
          API.get(`/videos?department=${selectedDept}&semester=${selectedSem}`),
          API.get("/progress/me"),
        ]);
        setVideos(vRes.data);

        const map = {};
        pRes.data.forEach((p) => { map[p.videoId] = p; });
        setProgressMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [selectedDept, selectedSem, user]);

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading lectures…</span>
      </div>
    );

  const getPercent = (video) => {
    const p = progressMap[video._id];
    if (!p || !video.duration) return 0;
    return Math.min(100, Math.round((p.watchTime / video.duration) * 100));
  };

  const filtered = videos.filter(
    (v) =>
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      (v.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.subject || "").toLowerCase().includes(search.toLowerCase())
  );

  // Group by Subject
  const groups = filtered.reduce((acc, v) => {
    const s = v.subject || "General";
    if (!acc[s]) acc[s] = [];
    acc[s].push(v);
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 2 }}>
              <h2 style={{ margin: 0 }}>Explore Lectures</h2>
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
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon purple"><BookOpen size={22} /></div>
            <div>
              <div className="stat-value">{videos.length}</div>
              <div className="stat-label">Total Lectures</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div className="stat-value">
                {Object.values(progressMap).filter((p) => p.isCompleted).length}
              </div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><Clock size={22} /></div>
            <div>
              <div className="stat-value">
                {(() => {
                  const total = Object.values(progressMap).reduce((a, p) => a + (p.watchTime || 0), 0);
                  const h = Math.floor(total / 3600);
                  const m = Math.floor((total % 3600) / 60);
                  return h > 0 ? `${h}h ${m}m` : `${m}m`;
                })()}
              </div>
              <div className="stat-label">Watch Time</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="toolbar">
          <div className="toolbar-left" style={{ width: "100%" }}>
            <div className="search-bar" style={{ maxWidth: "100%" }}>
              <Search size={18} />
              <input
                type="text"
                placeholder="Search lectures or subjects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <BookOpen />
            <p>{search ? "No lectures match your search." : "No lectures available yet. Check back soon!"}</p>
          </div>
        ) : (
          <div className="subject-groups">
            {Object.entries(groups).map(([subject, vids]) => (
              <div key={subject} className="subject-section" style={{ marginBottom: 40 }}>
                <h3 style={{ 
                  fontSize: "1.1rem", 
                  fontWeight: 800, 
                  marginBottom: 20, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 10,
                  color: "var(--text-primary)"
                }}>
                  <div style={{ width: 4, height: 20, background: "var(--primary)", borderRadius: 4 }} />
                  {subject}
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>({vids.length})</span>
                </h3>
                
                <div className="video-grid">
                  {vids.map((v) => {
                    const pct = getPercent(v);
                    const ytId = getYouTubeId(v.youtubeUrl);
                    const completed = progressMap[v._id]?.isCompleted;

                    return (
                      <div
                        key={v._id}
                        className="video-card"
                        onClick={() => navigate(`/student/watch/${v._id}`)}
                      >
                        <div className="video-card-thumb">
                          {ytId && (
                            <img
                              src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                              alt={v.title}
                            />
                          )}
                          <div className="video-card-play-icon">
                            <Play size={24} />
                          </div>
                        </div>

                        <div className="video-card-body">
                          <div className="video-card-title">{v.title}</div>
                          <div className="video-card-meta">
                            {v.teacherId?.name || "Teacher"} • {v.duration ? `${Math.round(v.duration / 60)} min` : "—"}
                          </div>

                          <div className="progress-bar-container">
                            <div className="progress-track">
                              <div
                                className={`progress-fill ${completed ? "completed" : ""}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="progress-label">
                              {completed ? "✓ Done" : `${pct}%`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
