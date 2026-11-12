// client/src/components/FileDetailsModal.jsx
// Size, chunk count, health, the chunk map, and the file's MongoDB document
// (first three chunk records).
import { useEffect, useState } from "react";
import { getFile } from "../api/files";
import { errorMessage } from "../api/client";
import { formatDate, formatSize, HEALTH } from "../nodes";
import ChunkMap, { NodeLegend } from "./ChunkMap";

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn quiet" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function FileDetailsModal({ fileId, onClose }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getFile(fileId).then(setFile).catch((err) => setError(errorMessage(err)));
  }, [fileId]);

  if (error) return <Modal title="File details" onClose={onClose}><p className="error">{error}</p></Modal>;
  if (!file) return <Modal title="Loading…" onClose={onClose} />;

  const doc = file.document;
  const shownDoc = {
    ...doc,
    chunks: [...doc.chunks.slice(0, 3), ...(doc.chunks.length > 3 ? [`… ${doc.chunks.length - 3} more`] : [])],
  };

  return (
    <Modal title={file.name} onClose={onClose}>
      <div className="facts">
        <span><b>Size</b>{formatSize(file.size)}</span>
        <span><b>Chunks</b>{file.chunkCount} × 1 MB</span>
        <span><b>Uploaded</b>{formatDate(file.createdAt)}</span>
        <span><b>Health</b><em className={HEALTH[file.health].className}>{HEALTH[file.health].label}</em></span>
      </div>
      <NodeLegend />
      <ChunkMap chunks={doc.chunks} availableNodes={file.availableNodes} />
      <h3>MongoDB document</h3>
      <pre className="doc">{JSON.stringify(shownDoc, null, 2)}</pre>
    </Modal>
  );
}
