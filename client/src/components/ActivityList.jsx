// client/src/components/ActivityList.jsx
import { formatDate } from "../nodes";

function describe(a) {
  const file = a.fileName ? `"${a.fileName}"` : "";
  switch (a.action) {
    case "UPLOAD": return `uploaded ${file}`;
    case "DELETE": return `deleted ${file}`;
    case "NODE_OFFLINE": return `took ${a.node} offline`;
    case "NODE_ONLINE": return `brought ${a.node} online`;
    case "DAMAGE": return `damaged chunk ${a.chunk + 1} of ${file} on ${a.node}`;
    case "DOWNLOAD": {
      const count = (t) => a.events.filter((e) => e.type === t).length;
      const notes = [
        count("NODE_OFFLINE") && `${count("NODE_OFFLINE")} offline copies skipped`,
        count("COPY_MISSING") && `${count("COPY_MISSING")} missing copies`,
        count("HASH_MISMATCH") && `${count("HASH_MISMATCH")} damaged copies found`,
        count("REPAIRED") && `${count("REPAIRED")} repaired`,
      ].filter(Boolean);
      return `downloaded ${file}${notes.length ? ` (${notes.join(", ")})` : ""}`;
    }
    default: return a.action;
  }
}

export default function ActivityList({ items }) {
  if (!items.length) return <p className="muted">No activity yet.</p>;
  return (
    <ul className="activity">
      {items.map((a) => (
        <li key={a._id}>
          <time>{formatDate(a.createdAt)}</time>
          <span><b>{a.user || "someone"}</b> {describe(a)}</span>
        </li>
      ))}
    </ul>
  );
}
