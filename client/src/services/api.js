// Axios API client — base instance pointing at /api with auth interceptor
// Automatically attaches JWT token to all requests, logs every call, and
// handles 401 redirects.
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

// Log every outgoing request (endpoint + payload)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const fullUrl = `${config.baseURL || ""}${config.url || ""}`;
  const body = config.data ? ` ${JSON.stringify(config.data)}` : "";
  console.log(`[API REQUEST] ${(config.method || "?").toUpperCase()} ${fullUrl}${body}`);
  return config;
});

// Log every response, and on failure surface the full error BEFORE redirecting
api.interceptors.response.use(
  (res) => {
    const fullUrl = `${res.config.baseURL || ""}${res.config.url || ""}`;
    console.log(`[API RESPONSE] ${(res.config.method || "?").toUpperCase()} ${fullUrl} -> ${res.status}`);
    return res;
  },
  (err) => {
    const fullUrl = `${err.config?.baseURL || ""}${err.config?.url || ""}`;
    const method = (err.config?.method || "?").toUpperCase();
    const status = err.response?.status;

    console.error(`[API ERROR] ${method} ${fullUrl} -> ${status || "no response"}`);
    if (err.response?.data) {
      console.error("[API ERROR] response body:", err.response.data);
    }
    if (!err.response) {
      console.error("[API ERROR] network / CORS failure:", err.message);
    }

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
