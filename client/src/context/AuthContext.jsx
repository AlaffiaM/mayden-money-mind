import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

      if (data.user.role !== "admin" && !data.user.emailVerified) {
        navigate("/verify-email-sent");
        return;
      }
      navigate(adminLogin ? "/admin" : "/dashboard");
    } finally {
      setLoading(false);
    }
  };

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

      navigate("/subscription");
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (email, code) => {
    const { data } = await api.post("/auth/verify-email", { email, code });
    if (data.success && data.token) {
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  };

  const resendVerification = async (email) => {
    return api.post("/auth/resend-verification", { email });
  };

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

