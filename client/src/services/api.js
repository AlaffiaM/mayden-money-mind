// Axios API client — base instance pointing at /api with an auth interceptor.
// Automatically attaches the JWT token to every request and surfaces API
// errors to the UI banner (no redirect).
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const fullUrl = `${err.config?.baseURL || ""}${err.config?.url || ""}`;
    const method = (err.config?.method || "?").toUpperCase();
    const status = err.response?.status;

    // Surface the error in the UI banner — NO redirect, session stays intact.
    window.dispatchEvent(
      new CustomEvent("api:error", {
        detail: {
          method,
          url: fullUrl,
          status: status || null,
          message: err.response?.data?.error || err.message,
        },
      })
    );
    return Promise.reject(err);
  }
);

export default api;
