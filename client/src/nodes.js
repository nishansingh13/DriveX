// client/src/nodes.js
// Node colours used on every screen, and small formatting helpers.
export const NODE_COLORS = {
  node1: "#3657D9",
  node2: "#0E8A8A",
  node3: "#D9822B",
  node4: "#B03A7A",
};
export const NODE_IDS = Object.keys(NODE_COLORS);

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const formatDate = (d) =>
  new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export const formatShortDate = (d) =>
  new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// plural(1, "chunk") is "1 chunk", plural(3, "chunk") is "3 chunks".
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const HEALTH = {
  ok: { label: "2 copies of every chunk", className: "health ok" },
  single: { label: "Running on single copies", className: "health single" },
  unavailable: { label: "Unavailable", className: "health bad" },
};
