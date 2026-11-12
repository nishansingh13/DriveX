// server/src/storage/inspector.js
// Checks every copy of a file's chunks without changing anything. Used by
// the storage map and the node status page. Each copy gets one state:
//   ok        the chunk file exists and its SHA-256 matches the metadata
//   damaged   the chunk file exists but its hash does not match
//   missing   there is no chunk file on that node
//   offline   the node is not available, so the copy can't be checked
const { REPLICATION_FACTOR } = require("../config/storage");
const store = require("./store");
const { chunkName } = require("./chunker");
const { sha256 } = require("./integrity");

async function copyState(fileId, chunk, nodeId, availableIds) {
  if (!availableIds.includes(nodeId)) return "offline";
  try {
    const buf = await store.read(nodeId, chunkName(fileId, chunk.index));
    return sha256(buf) === chunk.hash ? "ok" : "damaged";
  } catch {
    return "missing";
  }
}

// Returns [{ index, size, copies: [{ node, state }] }], copies in placement
// order, so copies[0] is the first copy.
async function inspectFile(file, availableIds) {
  const chunks = [];
  for (const c of file.chunks) {
    const copies = [];
    for (const node of c.nodes) {
      copies.push({ node, state: await copyState(file._id, c, node, availableIds) });
    }
    chunks.push({ index: c.index, size: c.size, copies });
  }
  return chunks;
}

// Health from the real state of the copies:
//   ok          every chunk has 2 good copies
//   single      every chunk has at least 1 good copy
//   unavailable some chunk has no good copy
function healthOfCopies(chunks) {
  let health = "ok";
  for (const c of chunks) {
    const good = c.copies.filter((x) => x.state === "ok").length;
    if (good === 0) return "unavailable";
    if (good < REPLICATION_FACTOR) health = "single";
  }
  return health;
}

module.exports = { inspectFile, healthOfCopies };
