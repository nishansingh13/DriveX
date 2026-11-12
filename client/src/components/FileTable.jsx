// client/src/components/FileTable.jsx
// The user's files. Clicking a row highlights its chunks on the map;
// clicking the name opens the details.
import { formatShortDate, formatSize, HEALTH } from "../nodes";

const extension = (name) => (name.includes(".") ? name.split(".").pop().slice(0, 4).toLowerCase() : "file");

export default function FileTable({ files, selectedId, busy, onSelect, onOpen, onDownload, onDelete }) {
  if (files.length === 0) {
    return (
      <div className="panel empty">
        <p>No files yet.</p>
        <p className="muted">Upload a file and watch its chunks land on the map.</p>
      </div>
    );
  }
  return (
    <div className="panel table-wrap">
      <table className="file-table">
        <colgroup>
          <col /><col className="w-size" /><col className="w-date" />
          <col className="w-chunks" /><col className="w-health" /><col className="w-actions" />
        </colgroup>
        <thead>
          <tr>
            <th>Name</th><th>Size</th><th>Uploaded</th><th>Chunks</th><th>Health</th>
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.id} className={f.id === selectedId ? "selected" : ""}
                onClick={() => onSelect(f.id === selectedId ? null : f.id)}>
              <td className="name">
                <span className="badge">{extension(f.name)}</span>
                <button className="link" title={f.name}
                        onClick={(e) => { e.stopPropagation(); onOpen(f.id); }}>
                  {f.name}
                </button>
              </td>
              <td>{formatSize(f.size)}</td>
              <td>{formatShortDate(f.createdAt)}</td>
              <td>{f.chunkCount}</td>
              <td><span className={HEALTH[f.health].className}>{HEALTH[f.health].label}</span></td>
              <td className="actions">
                <button className="btn secondary small" disabled={busy}
                        onClick={(e) => { e.stopPropagation(); onDownload(f.id); }}>
                  Download
                </button>
                <button className="btn danger small" disabled={busy}
                        onClick={(e) => { e.stopPropagation(); onDelete(f); }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
