import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);
    try {
      const { data } = await API.post("/auth/forgot-password", { email });
      setMsg(data.msg);
    } catch (err) {
      setError(err.response?.data?.msg || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Study<span>Track</span></h1>
        <p className="auth-subtitle">Reset your password</p>

        {error && <div className="auth-error">{error}</div>}

        {msg ? (
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "18px 20px",
            textAlign: "center",
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>📬</div>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>{msg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={18}
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
                />
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="auth-toggle" style={{ marginTop: 20 }}>
          <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
