import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { BarChart3, Download, Users, Clock, CheckCircle, GraduationCap } from "lucide-react";

export default function TeacherAnalytics() {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [analytics, setAnalytics] = useState([]);
  const [videoInfo, setVideoInfo] = useState(null);
  const [classroom, setClassroom] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("classroom"); // 'classroom' | 'video' | 'students'

  useEffect(() => {
    const load = async () => {
      try {
        const [vRes, cRes, sRes] = await Promise.all([
          API.get("/videos"),
          API.get("/progress/analytics/classroom"),
          API.get("/auth/students"),
        ]);
        setVideos(vRes.data);
        setClassroom(cRes.data);
        setEnrolledStudents(sRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadVideoAnalytics = async (videoId) => {
    if (!videoId) return;
    setSelectedVideo(videoId);
    try {
      const { data } = await API.get(`/progress/analytics/${videoId}`);
      setAnalytics(data.analytics);
      setVideoInfo(data.video);
    } catch (err) {
      console.error(err);
    }
  };

  // CSV export via fetch + blob download
  const handleExportCSV = async () => {
    if (!selectedVideo) return;
    try {
      const res = await API.get(`/progress/export-csv/${selectedVideo}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${videoInfo?.title || "attendance"}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    }
  };

  const handleExportClassroomCSV = async () => {
    try {
      const res = await API.get("/progress/export-classroom-csv", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Classroom-Overview.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    }
  };

  const handleExportStudentsCSV = async () => {
    try {
      const res = await API.get("/auth/export-students", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Student-List.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    }
  };

  const formatTime = (s) => {
    if (!s) return "0m";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading analytics…</span>
      </div>
    );

  // group classroom data by group
  const groups = {};
  classroom.forEach((s) => {
    const g = s.group || "Ungrouped";
    if (!groups[g]) groups[g] = [];
    groups[g].push(s);
  });

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Classroom Analytics</h2>
            <p>Monitor student engagement across all lectures</p>
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
            <div className="stat-icon purple"><GraduationCap size={22} /></div>
            <div>
              <div className="stat-value">{enrolledStudents.length}</div>
              <div className="stat-label">Enrolled Students</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle size={22} /></div>
            <div>
              <div className="stat-value">
                {classroom.length > 0
                  ? Math.round(classroom.reduce((a, s) => a + s.completionPercent, 0) / classroom.length)
                  : 0}%
              </div>
              <div className="stat-label">Avg Completion</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><Clock size={22} /></div>
            <div>
              <div className="stat-value">
                {formatTime(classroom.reduce((a, s) => a + s.totalWatchTime, 0))}
              </div>
              <div className="stat-label">Total Watch Time</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><BarChart3 size={22} /></div>
            <div>
              <div className="stat-value">{Object.keys(groups).length}</div>
              <div className="stat-label">Groups</div>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="tab-group">
              <button
                className={`tab-btn ${tab === "classroom" ? "active" : ""}`}
                onClick={() => setTab("classroom")}
              >
                <Users size={16} /> Classroom
              </button>
              <button
                className={`tab-btn ${tab === "video" ? "active" : ""}`}
                onClick={() => setTab("video")}
              >
                <BarChart3 size={16} /> Per-Video
              </button>
              <button
                className={`tab-btn ${tab === "students" ? "active" : ""}`}
                onClick={() => setTab("students")}
              >
                <GraduationCap size={16} /> Students
              </button>
            </div>
          </div>
          <div className="toolbar-right">
            {tab === "classroom" && classroom.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={handleExportClassroomCSV}>
                <Download size={16} /> Export CSV
              </button>
            )}
            {tab === "students" && enrolledStudents.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={handleExportStudentsCSV}>
                <Download size={16} /> Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Classroom Tab */}
        {tab === "classroom" && (
          <>
            {classroom.length === 0 ? (
              <div className="empty-state">
                <Users />
                <p>No student activity yet.</p>
              </div>
            ) : (
              Object.entries(groups).map(([groupName, students]) => (
                <div key={groupName} className="group-section">
                  <div className="group-header">
                    {groupName}
                    <span className="group-count">{students.length} students</span>
                  </div>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Email</th>
                          <th>Dept</th>
                          <th>College</th>
                          <th>Watch Time</th>
                          <th>Videos Done</th>
                          <th>Completion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{s.studentName}</td>
                            <td>{s.studentEmail}</td>
                            <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{s.department || "—"}</td>
                            <td>{s.collegeName || "—"}</td>
                            <td>{formatTime(s.totalWatchTime)}</td>
                            <td>{s.videosCompleted} / {s.totalVideos}</td>
                            <td>
                              <span className={`badge ${s.completionPercent >= 90 ? "badge-success" : s.completionPercent >= 50 ? "badge-warning" : "badge-primary"}`}>
                                {s.completionPercent}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Per-Video Tab */}
        {tab === "video" && (
          <>
            <div className="toolbar" style={{ marginTop: 0 }}>
              <div className="toolbar-left">
                <select
                  className="form-select"
                  style={{ maxWidth: 380 }}
                  value={selectedVideo}
                  onChange={(e) => loadVideoAnalytics(e.target.value)}
                >
                  <option value="">Select a video…</option>
                  {videos.map((v) => (
                    <option key={v._id} value={v._id}>{v.title}</option>
                  ))}
                </select>
              </div>
              <div className="toolbar-right">
                {selectedVideo && (
                  <button className="btn btn-success btn-sm" onClick={handleExportCSV}>
                    <Download size={16} /> Export CSV
                  </button>
                )}
              </div>
            </div>

            {selectedVideo && analytics.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Dept</th>
                      <th>Group</th>
                      <th>Watch Time</th>
                      <th>Completion</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map((a, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{a.studentName}</td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{a.department || "—"}</td>
                        <td>{a.group || "—"}</td>
                        <td>{formatTime(a.watchTime)}</td>
                        <td>
                          <div className="progress-bar-container">
                            <div className="progress-track">
                              <div
                                className={`progress-fill ${a.isCompleted ? "completed" : ""}`}
                                style={{ width: `${a.completionPercent}%` }}
                              />
                            </div>
                            <span className="progress-label">{a.completionPercent}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${a.isCompleted ? "badge-success" : "badge-warning"}`}>
                            {a.isCompleted ? "Completed" : "In Progress"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : selectedVideo ? (
              <div className="empty-state">
                <Users />
                <p>No student progress for this video yet.</p>
              </div>
            ) : null}
          </>
        )}

        {/* Enrolled Students Tab */}
        {tab === "students" && (
          <>
            {enrolledStudents.length === 0 ? (
              <div className="empty-state">
                <GraduationCap />
                <p>No students found in the <strong>{user?.department}</strong> department yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Semester</th>
                      <th>Group / Section</th>
                      <th>College</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map((s) => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td>{s.email}</td>
                        <td style={{ fontWeight: 500, color: "var(--primary)" }}>Sem {s.semester}</td>
                        <td>{s.group || "—"}</td>
                        <td>{s.collegeName || "—"}</td>
                        <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
