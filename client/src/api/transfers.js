// client/src/api/transfers.js
// Phone transfers: the laptop makes a one-time link (shown as a QR code),
// the phone uses it without logging in.
import api from "./client";

// ---- laptop (logged in) ----
export const createTransfer = (body) => api.post("/transfers", body).then((r) => r.data);
export const getTransferStatus = (token) => api.get(`/transfers/${token}/status`).then((r) => r.data);
export const cancelTransfer = (token) => api.delete(`/transfers/${token}`);

// ---- phone (token only) ----
export const getTransferInfo = (token) => api.get(`/transfers/public/${token}`).then((r) => r.data);

export function uploadToTransfer(token, file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/transfers/public/${token}/upload`, form, {
    onUploadProgress: (e) => e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
  });
}

// A plain address, so the phone's browser downloads the file itself
// (streaming straight to disk) instead of holding it in memory.
export const transferDownloadUrl = (token) =>
  `${import.meta.env.VITE_API_URL}/transfers/public/${token}/download`;
