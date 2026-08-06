// Auth context — manages user state, login/register/logout actions
// Persists user + token in localStorage and redirects based on role after login
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize user from localStorage so auth persists across page refreshes
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Login: POST credentials, store token + user, redirect by role
  // adminLogin flag: true = admin page (only admins allowed), false = user page (admins blocked)
  const login = async (email, password, adminLogin = false) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });

      if (adminLogin && data.user.role !== "admin") {
        throw { response: { data: { error: "This account does not have admin access." } } };
      }
      if (!adminLogin && data.user.role === "admin") {
        throw { response: { data: { error: "Admin accounts must use the admin login page." } } };
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      navigate(data.user.role === "admin" ? "/admin" : "/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Register: POST new user data (plus optional UTM attribution), store token + user, redirect
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
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      navigate("/subscription");
    } finally {
      setLoading(false);
    }
  };

  // Logout: clear storage and reset state, redirect to landing page
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for consuming auth context in any component
export const useAuth = () => useContext(AuthContext);
