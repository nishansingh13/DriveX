// client/src/components/ReadLog.jsx
// The steps of the current or last download, written as they happen
// (the download log of Fig 6.7).
import { useEffect, useRef } from "react";

const STATUS = { running: "Reading", done: "Verified", failed: "Failed" };

export default function ReadLog({ log }) {
  // Keep the newest line in view while the log grows.
  const list = useRef(null);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [log?.lines.length]);

  return (
    <section className="panel readlog" aria-live="polite">
      <h2>Read log</h2>
      {!log ? (
        <p className="muted">Download a file to watch DriveX read and verify each chunk on the map.</p>
      ) : (
        <>
          <p className="readlog-file">
            <span title={log.fileName}>{log.fileName}</span>
            <span className={`pill ${log.status}`}>{STATUS[log.status]}</span>
          </p>
          <ol className="steps" ref={list}>
            {log.lines.map((line, i) => <li key={i} className={line.tone}>{line.text}</li>)}
          </ol>
        </>
      )}
    </section>
  );
}
