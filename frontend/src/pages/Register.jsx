import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserPlus, Mail, Lock, User, Building2, Users, KeyRound } from "lucide-react";
import { DEPARTMENTS } from "../constants";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "student", collegeName: "", group: "", classCode: "",
    department: "", semester: 1
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const user = await register(form);
      navigate(user.role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      setError(err.response?.data?.msg || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Study<span>Track</span></h1>
        <p className="auth-subtitle">Create your account</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: "relative" }}>
              <User
                size={18}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
              />
              <input
                className="form-input"
                placeholder="John Doe"
                value={form.name}
                onChange={set("name")}
                required
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: "relative" }}>
              <Mail
                size={18}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
              />
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={set("email")}
                required
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
              />
              <input
                type="password"
                className="form-input"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={set("password")}
                required
                minLength={6}
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
              />
              <input
                type="password"
                className="form-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

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
              {[1, 2, 3, 4, 5, 6].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={set("role")}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          {form.role === "teacher" && (
            <div className="form-group">
              <small style={{ color: "var(--primary)", fontWeight: 500 }}>
                💡 Note: Only authorized emails (*teacher0817@gmail.com) can register as teachers.
              </small>
            </div>
          )}

          {form.role === "student" && (
            <>
              <div className="form-group">
                <label className="form-label">College Name</label>
                <div style={{ position: "relative" }}>
                  <Building2
                    size={18}
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
                  />
                  <input
                    className="form-input"
                    placeholder="e.g. MIT"
                    value={form.collegeName}
                    onChange={set("collegeName")}
                    style={{ paddingLeft: 42 }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Group / Section</label>
                <div style={{ position: "relative" }}>
                  <Users
                    size={18}
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
                  />
                  <input
                    className="form-input"
                    placeholder="e.g. CS-A"
                    value={form.group}
                    onChange={set("group")}
                    style={{ paddingLeft: 42 }}
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            <UserPlus size={18} />
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>

        <p className="auth-toggle">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
