// client/src/components/DemoPanel.jsx
// Admin only: walks through the fault-tolerance demo one step at a time,
// so the presenter controls the pace. Uses the selected file if it has at
// least 3 chunks, otherwise the largest such file.
import { useState } from "react";
import { errorMessage } from "../api/client";
import { NODE_IDS } from "../nodes";

const STEPS = [
  { title: "Download normally",
    detail: "Every chunk is read from its first copy and its hash is checked.",
    run: (a, id) => a.play(id) },
  { title: "Take node2 offline",
    detail: "Its column goes dark. Files now depend on their other copies.",
    run: (a) => a.nodes([["node2", false]]) },
  { title: "Download with node2 offline",
    detail: "Chunks with a copy on node2 are read from the copy on the next node.",
    run: (a, id) => a.play(id) },
  { title: "Take node3 offline too",
    detail: "Chunks stored on node2 and node3 now have no reachable copy.",
    run: (a) => a.nodes([["node3", false]]) },
  { title: "Try to download",
    detail: "DriveX refuses with a clear error instead of sending a broken file.",
    run: (a, id) => a.play(id) },
  { title: "Bring node2 and node3 back online",
    detail: "Both copies of every chunk are reachable again.",
    run: (a) => a.nodes([["node2", true], ["node3", true]]) },
  { title: "Damage a copy on node3",
    detail: "One byte of a chunk copy on node3 is flipped. Its square turns red.",
    run: (a, id) => a.damage("node3", id) },
  { title: "Download again",
    detail: "The damaged copy fails its hash check, the other copy is sent and the bad one is repaired.",
    run: (a, id) => a.play(id) },
];

export default function DemoPanel({ files, selectedId, actions, runTask, busy }) {
  const [step, setStep] = useState(0);        // index of the next step to run
  const [fileId, setFileId] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const candidates = files.filter((f) => f.chunkCount >= 3);
  const file = files.find((f) => f.id === fileId);
  const done = step === STEPS.length;

  async function next() {
    setError("");
    setRunning(true);
    try {
      // runTask makes sure nothing else (another button, the map refresh)
      // runs at the same time as a demo step.
      await runTask(async () => {
        let id = fileId;
        if (step === 0) {
          const pick = candidates.find((f) => f.id === selectedId)
            || [...candidates].sort((a, b) => b.chunkCount - a.chunkCount)[0];
          id = pick.id;
          setFileId(id);
          await actions.nodes(NODE_IDS.map((n) => [n, true]));   // start with every node online
        }
        await STEPS[step].run(actions, id);
        setStep((s) => s + 1);
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="panel demo">
      <h2>Fault-tolerance demo</h2>
      {candidates.length === 0 ? (
        <p className="muted">Upload a file of at least 3 MB to run the demo.</p>
      ) : (
        <>
          <p className="muted">
            {file ? <>Using <b>{file.name}</b>.</> : "Runs on the selected file, or your largest file."}
          </p>
          <ol className="demo-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className={i < step ? "done" : i === step ? "now" : ""}>
                <span>{s.title}</span>
                {i === step && <p>{s.detail}</p>}
              </li>
            ))}
          </ol>
          {done && <p className="demo-end">Every chunk has two good copies again.</p>}
          {error && <p className="error">{error}</p>}
          <div className="demo-actions">
            {done ? (
              <button className="btn" onClick={() => { setStep(0); setFileId(null); }}>Run the demo again</button>
            ) : (
              <button className="btn" disabled={busy} onClick={next}>
                {running ? "Running…" : step === 0 ? "Start the demo" : `Run step ${step + 1}`}
              </button>
            )}
            {step > 0 && !done && (
              <button className="btn quiet" disabled={running || busy}
                      onClick={() => { setStep(0); setFileId(null); }}>
                Start over
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
