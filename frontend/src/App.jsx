import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import VideoPlayer from "./pages/VideoPlayer";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import TeacherResources from "./pages/TeacherResources";
import StudentResources from "./pages/StudentResources";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-container"><div className="spinner" />Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Student */}
          <Route element={<ProtectedRoute role="student"><DashboardLayout /></ProtectedRoute>}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/watch/:id" element={<VideoPlayer />} />
            <Route path="/student/resources" element={<StudentResources />} />
          </Route>

          {/* Teacher */}
          <Route element={<ProtectedRoute role="teacher"><DashboardLayout /></ProtectedRoute>}>
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/watch/:id" element={<VideoPlayer mode="teacher" />} />
            <Route path="/teacher/resources" element={<TeacherResources />} />
            <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
          </Route>

          {/* Root */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
