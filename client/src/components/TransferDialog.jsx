// client/src/components/TransferDialog.jsx
// Shows a QR code for a one-time link and waits.
//   mode "receive": the phone scans, picks a file, and it arrives in your account
//   mode "send":    the phone scans and downloads one of your files
// The link lives for 5 minutes and works once; the server enforces both.
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { cancelTransfer, createTransfer, getTransferStatus } from "../api/transfers";
import { errorMessage } from "../api/client";
import { formatSize } from "../nodes";
import { Modal } from "./FileDetailsModal";

const POLL_MS = 1500;

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function TransferDialog({ mode, file, onClose, onReceived }) {
  const [transfer, setTransfer] = useState(null);   // { token, expiresAt }
  const [qr, setQr] = useState("");
  const [state, setState] = useState("starting");   // starting | waiting | done | expired | error
  const [received, setReceived] = useState(null);   // { id, name, size }
  const [error, setError] = useState("");
  const [left, setLeft] = useState(0);              // seconds until the link expires
  const tokenRef = useRef(null);
  const stateRef = useRef("starting");
  const started = useRef(false);

  const setBoth = (s) => { stateRef.current = s; setState(s); };

  const start = useCallback(async () => {
    setBoth("starting"); setError(""); setReceived(null); setQr("");
    try {
      const t = await createTransfer(mode === "send" ? { direction: "send", fileId: file.id } : { direction: "receive" });
      tokenRef.current = t.token;
      const link = `${window.location.origin}/t/${t.token}`;
      setQr(await QRCode.toDataURL(link, { width: 260, margin: 1 }));
      setTransfer({ ...t, link });
      setBoth("waiting");
    } catch (err) {
      setError(errorMessage(err));
      setBoth("error");
    }
  }, [mode, file]);

  // Create the link once (React's development mode runs effects twice).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
  }, [start]);

  // If the dialog closes while the link is still unused, cancel it.
  useEffect(() => () => {
    if (tokenRef.current && stateRef.current === "waiting") cancelTransfer(tokenRef.current).catch(() => {});
  }, []);

  // Countdown, and checking whether the phone has used the link.
  useEffect(() => {
    if (state !== "waiting" || !transfer) return;
    const tick = () => {
      const s = Math.max(0, Math.round((new Date(transfer.expiresAt) - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) setBoth("expired");
    };
    tick();
    const clockTimer = setInterval(tick, 1000);
    const pollTimer = setInterval(async () => {
      try {
        const st = await getTransferStatus(transfer.token);
        if (st.status === "done") {
          setReceived(st.receivedFile || null);
          setBoth("done");
          if (st.receivedFile) onReceived?.(st.receivedFile);
        } else if (st.status === "expired" || st.status === "cancelled") {
          setBoth("expired");
        }
      } catch { /* a missed check is fine, the next one will catch up */ }
    }, POLL_MS);
    return () => { clearInterval(clockTimer); clearInterval(pollTimer); };
  }, [state, transfer, onReceived]);

  const again = () => { started.current = true; start(); };
  const title = mode === "send" ? "Send to your phone" : "Receive from your phone";
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  return (
    <Modal title={title} onClose={onClose}>
      <div className="transfer">
        {state === "starting" && <p className="muted">Making a one-time link…</p>}

        {state === "error" && (
          <>
            <p className="error">{error}</p>
            <button className="btn" onClick={again}>Try again</button>
          </>
        )}

        {state === "waiting" && (
          <>
            <div className="qr"><img src={qr} alt="QR code for the one-time link" width="260" height="260" /></div>
            <p className="transfer-lead">
              {mode === "send"
                ? <>Scan this with your phone camera to download <b>{file.name}</b> ({formatSize(file.size)}).</>
                : <>Scan this with your phone camera, then pick a photo or file to send. Up to 20 MB.</>}
            </p>
            <p className="transfer-wait"><span className="pulse" /> Waiting for your phone…</p>
            <p className="muted small">Works once and expires in {clock(left)}.</p>
            {local && (
              <p className="notice small">
                This address only works on this computer. To try it with a real phone, open DriveX using your
                computer's network address (the phone must be on the same Wi-Fi), or use the deployed site.
              </p>
            )}
          </>
        )}

        {state === "done" && (
          <>
            <p className="transfer-ok">✓ {mode === "send" ? "Sent to your phone" : "Received"}</p>
            {received && (
              <p className="transfer-lead"><b>{received.name}</b> ({formatSize(received.size)}) is now stored, with a backup copy of every piece.</p>
            )}
            <div className="transfer-actions">
              <button className="btn" onClick={onClose}>Done</button>
              <button className="btn secondary" onClick={again}>{mode === "send" ? "New code" : "Receive another"}</button>
            </div>
          </>
        )}

        {state === "expired" && (
          <>
            <p className="transfer-lead">This code has expired. Make a new one.</p>
            <div className="transfer-actions">
              <button className="btn" onClick={again}>New code</button>
              <button className="btn quiet" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
