// client/src/components/StorageMap.jsx
// The main view: the four storage nodes as columns, and inside each column
// one square per chunk copy stored there. Solid squares are first copies,
// outlined squares are second copies (as in Fig 4.2). A damaged copy is
// red, a missing copy is a dashed outline, and copies on an unavailable
// node are hatched. During a download the replay highlights each copy as
// it is read.
import { NODE_COLORS, formatSize, plural } from "../nodes";

const STATE_LABEL = { damaged: "damaged", missing: "missing", offline: "on an offline node" };

function cellClass(cell, { selectedId, replay, newFileId }) {
  const { file, chunk, copy, first } = cell;
  const key = `${chunk.index}:${copy.node}`;
  let state = copy.state;
  const classes = ["cell", first ? "first" : "second"];

  if (replay) {
    if (replay.fileId !== file.id) {
      classes.push("dim");
    } else {
      if (replay.healed.has(key)) { state = "ok"; classes.push("healed"); }
      if (replay.blocked.has(chunk.index)) classes.push("blocked");
      const f = replay.frame;
      if (f && f.chunk === chunk.index && f.node === copy.node) classes.push("current", `k-${f.kind}`);
      else if (replay.read.has(key)) classes.push("verified");
      else classes.push("pending");
    }
  } else if (selectedId && selectedId !== file.id) {
    classes.push("dim");
  }
  if (newFileId === file.id) classes.push("appear");
  classes.push(state);
  return classes.join(" ");
}

export function MapLegend() {
  return (
    <div className="map-legend">
      <span><i className="cell first ok" style={{ "--c": "#8C98AB" }} />first copy</span>
      <span><i className="cell second ok" style={{ "--c": "#8C98AB" }} />second copy</span>
      <span><i className="cell damaged">!</i>damaged</span>
      <span><i className="cell missing" />missing</span>
      <span><i className="cell offline" />offline</span>
    </div>
  );
}

export default function StorageMap({ map, selectedId, replay, newFileId, onSelect,
                                     isAdmin, busy, onToggleNode, onDamage }) {
  return (
    <div className="map">
      {map.nodes.map((node) => {
        // Every copy that lives on this node, newest file first.
        const cells = [];
        let bytes = 0;
        for (const file of map.files) {
          for (const chunk of file.chunks) {
            chunk.copies.forEach((copy, k) => {
              if (copy.node !== node.id) return;
              bytes += chunk.size;
              cells.push({ file, chunk, copy, first: k === 0 });
            });
          }
        }
        const status = node.available ? "Online" : node.online ? "Folder missing" : "Offline";

        return (
          <section key={node.id} className={node.available ? "column" : "column down"}
                   style={{ "--c": NODE_COLORS[node.id] }} aria-label={`${node.id}, ${status}`}>
            <header>
              <span className="lamp" />
              <h3>{node.id}</h3>
              <span className={node.available ? "status on" : "status off"}>{status}</span>
              <p>{plural(cells.length, "copy", "copies")}, {formatSize(bytes)}</p>
            </header>

            <div className="cells">
              {cells.map((cell) => {
                const { file, chunk, copy, first } = cell;
                const note = STATE_LABEL[copy.state] ? `, ${STATE_LABEL[copy.state]}` : "";
                return (
                  <button
                    key={`${file.id}:${chunk.index}:${first}`}
                    className={cellClass(cell, { selectedId, replay, newFileId })}
                    style={newFileId === file.id ? { animationDelay: `${Math.min(chunk.index * 35, 1400)}ms` } : undefined}
                    title={`${file.name}, chunk ${chunk.index + 1}, ${first ? "first" : "second"} copy${note}`}
                    aria-label={`${file.name}, chunk ${chunk.index + 1}, ${first ? "first" : "second"} copy${note}`}
                    onClick={() => onSelect(file.id)}
                  >
                    {copy.state === "damaged" && !replay?.healed.has(`${chunk.index}:${copy.node}`) ? "!" : ""}
                  </button>
                );
              })}
              {cells.length === 0 && <p className="column-empty">No chunks yet</p>}
            </div>

            {isAdmin && (
              <footer>
                <button className="btn secondary small" disabled={busy} onClick={() => onToggleNode(node)}>
                  {node.online ? "Take offline" : "Bring online"}
                </button>
                <button className="btn quiet small" disabled={busy || !node.available} onClick={() => onDamage(node)}>
                  Damage a chunk
                </button>
              </footer>
            )}
          </section>
        );
      })}
    </div>
  );
}
