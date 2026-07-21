// App root — defines all routes, route guards, and wraps everything in AuthProvider
// Route guards: ProtectedRoute (logged in), SubscriberRoute (active sub), AdminRoute (admin role)
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import api from "./services/api";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import Subscription from "./pages/Subscription";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEpisodes from "./pages/admin/Episodes";
import AdminUsers from "./pages/admin/Users";
import AdminUserDetail from "./pages/admin/UserDetail";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminNotifications from "./pages/admin/Notifications";
import AdminSettings from "./pages/admin/Settings";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./components/layout/AdminLayout";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";

// Redirects unauthenticated users to /login
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Checks if user has an active subscription — redirects to /subscription if not
function SubscriberRoute({ children }) {
  const { user, logout } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      setHasAccess(false);
      return;
    }
    api.get("/subscriptions/mine")
      .then(({ data }) => setHasAccess(data?.status === "active"))
      .catch((err) => {
        if (err.response?.status === 401) logout();
        setHasAccess(false);
      })
      .finally(() => setChecking(false));
  }, [user, logout]);

  if (!user) return <Navigate to="/login" replace />;
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mayden-magenta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!hasAccess) return <Navigate to="/subscription" replace />;
  return children;
}

// Requires admin role — wraps content in AdminLayout sidebar
function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== "admin") return <Navigate to="/admin/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

// Route definitions — public, subscriber-only, and admin-only paths
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Subscriber-only routes (requires active subscription) */}
      <Route path="/dashboard" element={<SubscriberRoute><Dashboard /></SubscriberRoute>} />
      <Route path="/library" element={<SubscriberRoute><Library /></SubscriberRoute>} />
      <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />

      {/* Admin routes (requires admin role, wrapped in AdminLayout) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/episodes" element={<AdminRoute><AdminEpisodes /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/users/:id" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
      <Route path="/admin/subscriptions" element={<AdminRoute><AdminSubscriptions /></AdminRoute>} />
      <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

      {/* Footer pages (public) */}
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/support" element={<Support />} />

      {/* Catch-all: redirect unknown paths to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// App shell: BrowserRouter → AuthProvider → AppRoutes
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
