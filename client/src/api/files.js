// client/src/api/files.js
import api from "./client";

export function uploadFile(file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  return api.post("/files/upload", form, {
    onUploadProgress: (e) => onProgress(Math.round((e.loaded / e.total) * 100)),
  });
}

// Downloads the file and returns the bytes (so the read log can check the
// whole-file hash). With save: false the file is not saved to disk, which
// the demo scenario uses so it doesn't fill the Downloads folder.
export async function downloadFile(id, name, { save = true } = {}) {
  let res;
  try {
    res = await api.get(`/files/${id}/download`, { responseType: "blob" });
  } catch (err) {
    // Error bodies arrive as a Blob too: turn them back into JSON.
    if (err.response?.data instanceof Blob) {
      err.response.data = JSON.parse(await err.response.data.text());
    }
    throw err;
  }
  if (!save) return res.data;
  const url = URL.createObjectURL(res.data);
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: name,
  });
  link.click();
  URL.revokeObjectURL(url);
  return res.data;
}

export const listFiles = () => api.get("/files").then((r) => r.data);
export const getMap = () => api.get("/files/map").then((r) => r.data);
export const getFile = (id) => api.get(`/files/${id}`).then((r) => r.data);
export const deleteFile = (id) => api.delete(`/files/${id}`);
export const getDownloadLog = (id) => api.get(`/files/${id}/download-log`).then((r) => r.data);

export const getNodes = () => api.get("/nodes").then((r) => r.data);
export const setNodeOnline = (id, online) => api.patch(`/nodes/${id}`, { online });
export const damageNode = (id, fileId) =>
  api.post(`/nodes/${id}/damage`, fileId ? { file: fileId } : {}).then((r) => r.data);
export const getHealth = () => api.get("/health").then((r) => r.data);
export const getActivity = () => api.get("/activity").then((r) => r.data);
