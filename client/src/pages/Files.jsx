// client/src/pages/Files.jsx
// The main screen: storage map, file list, read log and (for admins) the
// fault-tolerance demo.
import { useCallback, useEffect, useRef, useState } from "react";
import { damageNode, deleteFile, getMap, setNodeOnline } from "../api/files";
import { errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatSize, plural } from "../nodes";
import { runDownload } from "../replay";
import { announceNodeChange } from "../useAvailableNodes";
import StorageMap, { MapLegend } from "../components/StorageMap";
import FileTable from "../components/FileTable";
import UploadPanel from "../components/UploadPanel";
import FileDetailsModal from "../components/FileDetailsModal";
import ReadLog from "../components/ReadLog";
import DemoPanel from "../components/DemoPanel";

export default function Files() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [map, setMap] = useState(null);
  const [notice, setNotice] = useState(null);       // { text, error? }
  const [selectedId, setSelectedId] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [newFileId, setNewFileId] = useState(null);
  const [replay, setReplay] = useState(null);       // what the map highlights during a download
  const [log, setLog] = useState(null);             // the read log
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);                    // same as busy, readable inside the timer

  const load = useCallback(async () => {
    const data = await getMap();
    setMap(data);
    return data;
  }, []);

  // Load now, then refresh every 6 seconds (but never during a replay).
  useEffect(() => {
    load().catch((err) => setNotice({ text: errorMessage(err), error: true }));
    const timer = setInterval(() => { if (!busyRef.current) load().catch(() => {}); }, 6000);
    return () => clearInterval(timer);
  }, [load]);

  // Runs one action at a time and shows any error.
  async function task(action) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      return await action();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function changeNodes(changes) {
    for (const [id, online] of changes) await setNodeOnline(id, online);
    announceNodeChange();
    await load();
  }

  async function damage(nodeId, fileId) {
    const res = await damageNode(nodeId, fileId);
    setSelectedId(res.fileId || fileId || selectedId);
    setNotice({ text: `Damaged chunk ${res.chunk + 1} of "${res.file}" on ${res.node}. Download it to see the repair.` });
    await load();
  }

  // Actions the demo panel can run. Downloads in the demo are not saved to disk.
  const demoActions = { play: (id) => replayDownload(id, false), nodes: changeNodes, damage };

  async function replayDownload(fileId, save) {
    const fresh = await load();                    // start from the real copy states
    const file = fresh.files.find((f) => f.id === fileId);
    if (!file) return;
    setSelectedId(file.id);
    await runDownload(file, { save, setReplay, setLog });
    await load();
  }

  const guarded = (fn) => task(() => fn().catch((err) => setNotice({ text: errorMessage(err), error: true })));

  async function remove(file) {
    if (!window.confirm(`Delete "${file.name}" and all of its chunk copies?`)) return;
    await guarded(async () => {
      await deleteFile(file.id);
      if (selectedId === file.id) setSelectedId(null);
      await load();
    });
  }

  function uploaded(id) {
    setNewFileId(id);
    setSelectedId(id);
    load();
    setTimeout(() => setNewFileId(null), 2500);
  }

  if (!map) return <p className="muted">{notice?.text || "Loading the storage map…"}</p>;
  const total = map.files.reduce((sum, f) => sum + f.size, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My files</h1>
          <p className="muted">{plural(map.files.length, "file")}, {formatSize(total)} in total</p>
        </div>
        <button className="btn" onClick={() => setShowUpload((s) => !s)}>
          {showUpload ? "Close upload" : "Upload file"}
        </button>
      </div>

      {showUpload && <UploadPanel onUploaded={uploaded} />}
      {notice && (
        <p className={notice.error ? "notice error" : "notice"}>
          {notice.text}
          <button className="btn quiet small" onClick={() => setNotice(null)}>Dismiss</button>
        </p>
      )}

      <div className="workspace">
        <div className="main">
          <section className="map-section">
            <div className="section-head">
              <div>
                <h2>Storage map</h2>
                <p className="muted">Each square is one copy of a 1 MB chunk. Click a square or a file to find all of its chunks.</p>
              </div>
              <MapLegend />
            </div>
            <StorageMap
              map={map} selectedId={selectedId} replay={replay} newFileId={newFileId}
              onSelect={(id) => !busy && setSelectedId(id === selectedId ? null : id)}
              isAdmin={isAdmin} busy={busy}
              onToggleNode={(node) => guarded(() => changeNodes([[node.id, !node.online]]))}
              onDamage={(node) => guarded(() => damage(node.id, selectedId || undefined))}
            />
          </section>
          <FileTable
            files={map.files} selectedId={selectedId} busy={busy}
            onSelect={(id) => !busy && setSelectedId(id)} onOpen={setOpenId}
            onDownload={(id) => guarded(() => replayDownload(id, true))} onDelete={remove}
          />
        </div>
        <aside className="side">
          {isAdmin && (
            <DemoPanel files={map.files} selectedId={selectedId} busy={busy}
                       actions={demoActions} runTask={task} />
          )}
          <ReadLog log={log} />
        </aside>
      </div>

      {openId && <FileDetailsModal fileId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
