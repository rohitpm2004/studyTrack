import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Video,
  BarChart3,
  LogOut,
  Menu,
  X,
  FileText,
} from "lucide-react";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isTeacher = user?.role === "teacher";

  const links = isTeacher
    ? [
        { to: "/teacher", label: "Dashboard", icon: LayoutDashboard },
        { to: "/teacher/resources", label: "Resources", icon: FileText },
        { to: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
      ]
    : [
        { to: "/student", label: "My Lectures", icon: Video },
        { to: "/student/resources", label: "Resources", icon: FileText },
      ];

  return (
    <>
      {/* Mobile header */}
      <div className="mobile-header">
        <h1>Study<span>Track</span></h1>
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div className="app-layout">
        {/* Overlay */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-brand">
            <h1>Study<span>Track</span></h1>
            <p>{isTeacher ? "Teacher Portal" : "Student Portal"}</p>
          </div>

          <nav className="sidebar-nav">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.name}</div>
                <div className="sidebar-user-role">{user?.role}</div>
              </div>
            </div>
            <button className="sidebar-link" onClick={handleLogout}>
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
