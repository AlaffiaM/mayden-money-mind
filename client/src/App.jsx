import { lazy, Suspense, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { PlayerProvider } from "./context/PlayerContext";
import { captureUtm } from "./utils/utm";
import api from "./services/api";
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const VerifyEmailSent = lazy(() => import("./pages/VerifyEmailSent"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Library = lazy(() => import("./pages/Library"));
const Subscription = lazy(() => import("./pages/Subscription"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminEpisodes = lazy(() => import("./pages/admin/Episodes"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminUserDetail = lazy(() => import("./pages/admin/UserDetail"));
const AdminSubscriptions = lazy(() => import("./pages/admin/Subscriptions"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
import AdminLayout from "./components/layout/AdminLayout";
import { ToastProvider } from "./components/admin/ToastProvider";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function SubscriberRoute({ children }) {
  const { user, logout } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    api
      .get("/subscriptions/mine")
      .then(({ data }) => setHasAccess(data?.status === "active"))
      .catch((err) => {
        if (err.response?.status === 401) logout();
        setHasAccess(false);
      })
      .finally(() => setChecking(false));
  }, [user, logout]);

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== "admin" && !user.emailVerified)
    return <Navigate to="/verify-email-sent" replace />;
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

function VerifiedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin" && !user.emailVerified)
    return <Navigate to="/verify-email-sent" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== "admin") return <Navigate to="/admin/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mayden-magenta border-t-transparent" />
        </div>
      }
    >
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-email-sent" element={<VerifyEmailSent />} />

      <Route
        path="/dashboard"
        element={
          <SubscriberRoute>
            <Dashboard />
          </SubscriberRoute>
        }
      />
      <Route
        path="/library"
        element={
          <VerifiedRoute>
            <Library />
          </VerifiedRoute>
        }
      />
      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        }
      />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/episodes"
        element={
          <AdminRoute>
            <AdminEpisodes />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users/:id"
        element={
          <AdminRoute>
            <AdminUserDetail />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/subscriptions"
        element={
          <AdminRoute>
            <AdminSubscriptions />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <AdminRoute>
            <AdminNotifications />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <AdminSettings />
          </AdminRoute>
        }
      />

      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/support" element={<Support />} />

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function NormalizedRoutes() {
  const { pathname, search, hash } = useLocation();
  if (pathname.startsWith("//")) {
    return <Navigate to={`${pathname.slice(1)}${search}${hash}`} replace />;
  }
  return <AppRoutes />;
}

export default function App() {
  useEffect(() => {
    captureUtm();
  }, []);

  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <PlayerProvider>
            <NormalizedRoutes />
          </PlayerProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
