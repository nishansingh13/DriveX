// client/src/components/ChunkMap.jsx
// File details: one numbered tile per chunk, split into one band per copy
// in the colour of the node holding it. Copies on an unavailable node are
// hatched.
import { NODE_COLORS, NODE_IDS } from "../nodes";

export function NodeLegend() {
  return (
    <div className="legend">
      {NODE_IDS.map((id) => (
        <span key={id}><i style={{ background: NODE_COLORS[id] }} />{id}</span>
      ))}
      <span><i className="off" />on an offline node</span>
    </div>
  );
}

export default function ChunkMap({ chunks, availableNodes = NODE_IDS }) {
  return (
    <div className="chunk-map">
      {chunks.map((c) => (
        <span key={c.index} className="chunk" title={`Chunk ${c.index + 1}: ${c.nodes.join(" and ")}`}>
          <small>{c.index + 1}</small>
          <span className="chunk-square">
            {c.nodes.map((id) =>
              availableNodes.includes(id)
                ? <i key={id} style={{ background: NODE_COLORS[id] }} />
                : <i key={id} className="off" />
            )}
          </span>
        </span>
      ))}
    </div>
  );
}
