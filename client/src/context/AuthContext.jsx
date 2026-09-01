// Auth context — manages user state, login/register/logout actions
// Persists user + token in sessionStorage (cleared when the tab/browser closes)
// and redirects based on which login page was used.
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize user from sessionStorage so auth persists across page refreshes
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Login: POST credentials, store token + user, redirect by page
  // adminLogin flag: true = admin page (only admins allowed), false = user page (anyone allowed)
  const login = async (email, password, adminLogin = false) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });

      if (adminLogin && data.user.role !== "admin") {
        throw { response: { data: { error: "This account does not have admin access." } } };
      }

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);

      // Unverified self-serve users must verify their email before their dashboard.
      if (data.user.role !== "admin" && !data.user.emailVerified) {
        navigate("/verify-email-sent");
        return;
      }
      navigate(adminLogin ? "/admin" : "/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Register: POST new user data (plus optional UTM attribution), store token + user.
  // Non-admin accounts land on a "check your inbox" page until their email is verified.
  const register = async (fullName, email, phone, password, utm = {}) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        fullName,
        email,
        phone,
        password,
        utmSource: utm.utm_source || null,
        utmMedium: utm.utm_medium || null,
        utmCampaign: utm.utm_campaign || null,
        utmTerm: utm.utm_term || null,
        utmContent: utm.utm_content || null,
      });
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      if (data.user.role !== "admin" && !data.user.emailVerified) {
        navigate("/verify-email-sent");
        return;
      }
      // Existing verified/admin users (e.g. seeded admins) go straight through.
      navigate("/subscription");
    } finally {
      setLoading(false);
    }
  };

  // Consume a single-use verification token. On success re-sync the stored user
  // so the app knows the email is now verified.
  const verifyEmail = async (token) => {
    const { data } = await api.post("/auth/verify-email", { token });
    if (data.success) {
      setUser((prev) => (prev ? { ...prev, emailVerified: true } : prev));
      const stored = sessionStorage.getItem("user");
      if (stored) {
        sessionStorage.setItem("user", JSON.stringify({ ...JSON.parse(stored), emailVerified: true }));
      }
    }
    return data;
  };

  // Request a fresh verification email. Always resolves as success (enumeration-safe).
  const resendVerification = async (email) => {
    return api.post("/auth/resend-verification", { email });
  };

  // Logout: clear storage and reset state, redirect to landing page
  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, login, register, logout, loading, verifyEmail, resendVerification }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for consuming auth context in any component
export const useAuth = () => useContext(AuthContext);
