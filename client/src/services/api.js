import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
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
