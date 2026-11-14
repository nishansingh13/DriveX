// client/src/pages/PhoneTransfer.jsx
// What the phone opens after scanning the QR code. No login: the one-time
// link in the address is the permission, and it does one job only.
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getTransferInfo, transferDownloadUrl, uploadToTransfer } from "../api/transfers";
import { errorMessage } from "../api/client";
import { formatSize } from "../nodes";
import { Logo } from "../components/Navbar";

export default function PhoneTransfer() {
  const { token } = useParams();
  const input = useRef(null);
  const [info, setInfo] = useState(null);
  const [phase, setPhase] = useState("loading");    // loading | ready | sending | done | gone
  const [progress, setProgress] = useState(0);
  const [sent, setSent] = useState(null);           // { name, size }
  const [message, setMessage] = useState("");       // a problem the person can fix by trying again

  useEffect(() => {
    getTransferInfo(token)
      .then((i) => { setInfo(i); setPhase("ready"); })
      .catch((err) => { setMessage(errorMessage(err)); setPhase("gone"); });
  }, [token]);

  async function pick(file) {
    if (!file) return;
    setMessage("");
    if (file.size > info.maxBytes) {
      return setMessage(`That file is ${formatSize(file.size)}. The limit is ${formatSize(info.maxBytes)}. Choose a smaller one.`);
    }
    setPhase("sending"); setProgress(0);
    try {
      const res = await uploadToTransfer(token, file, setProgress);
      setSent(res.data);
      setPhase("done");
    } catch (err) {
      if (err.response?.status === 404) { setMessage(errorMessage(err)); return setPhase("gone"); }
      setMessage(errorMessage(err));
      setPhase("ready");                            // the link was not used up: try again
    }
  }

  function download() {
    window.location.assign(transferDownloadUrl(token));
    setSent({ name: info.file.name, size: info.file.size });
    setPhase("done");
  }

  const sending = info?.direction === "receive";

  return (
    <main className="phone">
      <Logo />
      <div className="phone-card">
        {phase === "loading" && <p className="muted">Checking the link…</p>}

        {phase === "gone" && (
          <>
            <h1>This link can't be used</h1>
            <p className="muted">{message}</p>
          </>
        )}

        {phase === "ready" && sending && (
          <>
            <h1>Send a file to {info.owner}'s DriveX</h1>
            <p className="muted">It will be stored safely, with a backup copy of every piece.</p>
            <button className="btn big" onClick={() => input.current.click()}>Choose a photo or file</button>
            <input ref={input} type="file" hidden onChange={(e) => pick(e.target.files[0])} />
            {message && <p className="error">{message}</p>}
            <p className="muted small">Up to {formatSize(info.maxBytes)}. This link works once.</p>
          </>
        )}

        {phase === "ready" && !sending && (
          <>
            <h1>{info.file?.name}</h1>
            <p className="muted">{info.file && formatSize(info.file.size)}, from {info.owner}'s DriveX</p>
            <button className="btn big" onClick={download}>Download</button>
            <p className="muted small">This link works once.</p>
          </>
        )}

        {phase === "sending" && (
          <>
            <h1>Sending…</h1>
            <div className="progress wide"><span style={{ width: `${progress}%` }} /></div>
            <p className="muted">{progress < 100 ? `${progress}%` : "Storing it safely…"}</p>
          </>
        )}

        {phase === "done" && (
          <>
            <h1 className="ok-text">✓ {sending ? "Sent" : "Download started"}</h1>
            <p><b>{sent?.name}</b></p>
            <p className="muted">{sending ? "You can close this page." : "Check your downloads. You can close this page."}</p>
          </>
        )}
      </div>
    </main>
  );
}
