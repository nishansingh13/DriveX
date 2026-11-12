// client/src/components/UploadPanel.jsx
// A slim drop strip with a Choose file button. Shows progress while the
// file uploads; when the server answers, the new chunks land on the map.
import { useRef, useState } from "react";
import { uploadFile } from "../api/files";
import { errorMessage } from "../api/client";
import { plural } from "../nodes";

const MAX_SIZE = 100 * 1024 * 1024;

export default function UploadPanel({ onUploaded }) {
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [job, setJob] = useState(null);   // { name, progress, chunkCount?, error? }

  async function start(file) {
    if (!file) return;
    if (file.size > MAX_SIZE) {
      return setJob({ name: file.name, error: "File is larger than 100 MB. Choose a smaller file." });
    }
    setJob({ name: file.name, progress: 0 });
    try {
      const res = await uploadFile(file, (progress) => setJob((j) => ({ ...j, progress })));
      setJob({ name: file.name, progress: 100, chunkCount: res.data.chunks.length });
      onUploaded(res.data.id);
    } catch (err) {
      setJob({ name: file.name, error: errorMessage(err) });
    }
  }

  const uploading = job && !job.error && job.chunkCount === undefined;

  return (
    <div
      className={dragging ? "upload dragging" : "upload"}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); start(e.dataTransfer.files[0]); }}
    >
      <div className="upload-prompt">
        <b>Drop a file here</b>
        <button className="btn secondary small" disabled={uploading} onClick={() => input.current.click()}>
          Choose file
        </button>
        <span className="muted">Up to 100 MB. Split into 1 MB chunks, two copies of each.</span>
        <input ref={input} type="file" hidden
               onChange={(e) => { start(e.target.files[0]); e.target.value = ""; }} />
      </div>
      {job && (
        <div className="upload-status" aria-live="polite">
          {job.error ? (
            <span className="error">{job.name}: {job.error}</span>
          ) : uploading ? (
            <>
              <span>Uploading <b>{job.name}</b></span>
              <span className="progress"><span style={{ width: `${job.progress}%` }} /></span>
              <span className="muted">{job.progress < 100 ? `${job.progress}%` : "Storing chunks…"}</span>
            </>
          ) : (
            <span>Stored <b>{job.name}</b>: {plural(job.chunkCount, "chunk")}, two copies of each.</span>
          )}
        </div>
      )}
    </div>
  );
}
