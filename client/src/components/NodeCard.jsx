// client/src/components/NodeCard.jsx
// A storage node drawn as a drive bay: status light, a vertical gauge of
// the space it uses, its counts, and the demo buttons.
import { NODE_COLORS, formatSize } from "../nodes";

export default function NodeCard({ node, maxBytes, busy, onToggle, onDamage }) {
  const color = NODE_COLORS[node.id];
  const fill = maxBytes ? Math.round((node.bytesUsed / maxBytes) * 100) : 0;
  const status = node.available ? "Online" : node.online ? "Folder missing" : "Offline";

  return (
    <section className={node.available ? "bay" : "bay down"} aria-label={`${node.id}, ${status}`}>
      <header className="bay-head">
        <span className="bay-light" style={node.available ? { background: color } : undefined} />
        <h3 style={{ color: node.available ? color : undefined }}>{node.id}</h3>
        <span className={node.available ? "status on" : "status off"}>{status}</span>
      </header>
      <code className="bay-path">{node.path}</code>
      <div className="bay-body">
        <div className="gauge" aria-hidden="true">
          <div style={{ height: `${fill}%`, background: node.available ? color : undefined }} />
        </div>
        <dl>
          <dt>Chunk copies</dt><dd>{node.chunkCount}</dd>
          <dt>Space used</dt><dd>{formatSize(node.bytesUsed)}</dd>
          <dt>Damaged copies</dt>
          <dd className={node.damaged ? "fault" : ""}>{node.damaged ?? "Not checked"}</dd>
        </dl>
      </div>
      <div className="bay-actions">
        <button className="btn secondary small" disabled={busy} onClick={onToggle}>
          {node.online ? "Take offline" : "Bring online"}
        </button>
        <button className="btn quiet small" disabled={busy || !node.available} onClick={onDamage}>
          Damage a chunk
        </button>
      </div>
    </section>
  );
}
