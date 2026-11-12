// client/src/api/client.js
import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("drivex_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // A 401 on a logged-in request means the session expired.
    // (Not on the login form itself, where 401 means wrong password.)
    if (err.response?.status === 401 && !err.config.url.startsWith("/auth/")) {
      localStorage.removeItem("drivex_token");
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

// The error message the server sent, or a fallback.
export const errorMessage = (err) =>
  err.response?.data?.error || err.message || "Something went wrong";

export default api;
