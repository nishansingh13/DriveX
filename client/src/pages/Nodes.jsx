// client/src/pages/Nodes.jsx
// Storage nodes (admin only, Fig 6.6): node cards, file availability
// summary and the activity list.
import { useCallback, useEffect, useState } from "react";
import { damageNode, getActivity, getNodes, setNodeOnline } from "../api/files";
import { errorMessage } from "../api/client";
import NodeCard from "../components/NodeCard";
import ActivityList from "../components/ActivityList";
import { announceNodeChange } from "../useAvailableNodes";

export default function Nodes() {
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [nodes, act] = await Promise.all([getNodes(), getActivity()]);
    setData(nodes);
    setActivity(act);
  }, []);
  useEffect(() => { load().catch((err) => setMessage(errorMessage(err))); }, [load]);

  async function run(action) {
    setBusy(true);
    setMessage("");
    try {
      setMessage((await action()) || "");
      announceNodeChange();
      await load();
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const toggle = (node) => run(async () => {
    const res = await setNodeOnline(node.id, !node.online);
    return res.data.orphansRemoved ? `${node.id}: removed ${res.data.orphansRemoved} orphan chunk files.` : "";
  });
  const damage = (node) => run(async () => {
    const res = await damageNode(node.id);
    return `Damaged chunk ${res.chunk + 1} of "${res.file}" on ${res.node}. Download it to see it repaired.`;
  });

  if (!data) return <p className="muted">{message || "Loading…"}</p>;
  const maxBytes = Math.max(...data.nodes.map((n) => n.bytesUsed), 1);
  const { ok, single, unavailable } = data.files;

  return (
    <div className="nodes-page">
      <div className="page-head">
        <div>
          <h1>Storage nodes</h1>
          <p className="muted">Take a node offline or damage a chunk, then download a file to see DriveX recover.</p>
        </div>
        <button className="btn secondary" onClick={() => run(async () => "")} disabled={busy}>Refresh</button>
      </div>
      {message && <p className="notice">{message}</p>}
      <div className="bays">
        {data.nodes.map((n) => (
          <NodeCard key={n.id} node={n} maxBytes={maxBytes} busy={busy}
                    onToggle={() => toggle(n)} onDamage={() => damage(n)} />
        ))}
      </div>
      <h2>File availability</h2>
      <p className="panel availability">
        Of {ok + single + unavailable} {ok + single + unavailable === 1 ? "file" : "files"},{" "}
        <b className="health ok">{ok}</b> {ok === 1 ? "has" : "have"} two reachable copies,{" "}
        <b className="health single">{single}</b> {single === 1 ? "is" : "are"} running on single copies and{" "}
        <b className="health bad">{unavailable}</b> {unavailable === 1 ? "is" : "are"} unavailable.
      </p>
      <h2>Activity</h2>
      <div className="panel"><ActivityList items={activity} /></div>
    </div>
  );
}
