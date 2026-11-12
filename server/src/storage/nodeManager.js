// server/src/storage/nodeManager.js
const fsp = require("fs/promises");
const path = require("path");
const Node = require("../models/Node");
const { NODE_IDS, nodePath, TMP_DIR } = require("../config/storage");

// Run once at start-up: make sure every node folder, the tmp folder
// and every node record exist. Existing records are left unchanged,
// so a node that was taken offline stays offline after a restart.
async function ensureNodes() {
  for (const id of NODE_IDS) {
    await fsp.mkdir(nodePath(id), { recursive: true });
    await Node.updateOne(
      { nodeId: id },
      { $setOnInsert: { nodeId: id, online: true } },
      { upsert: true }
    );
  }
  await fsp.mkdir(TMP_DIR, { recursive: true });
}

// A node is available only when it is marked online and its folder exists.
async function availableIds() {
  const online = await Node.find({ online: true }).lean();
  const ids = [];
  for (const { nodeId } of online) {
    try {
      await fsp.access(nodePath(nodeId));
      ids.push(nodeId);
    } catch {
      /* folder missing: treat the node as failed */
    }
  }
  return ids;
}

// Delete chunk files on a node that no File document refers to any more
// (left behind when a file was deleted while the node was down).
// Returns how many files were removed.
async function sweepOrphans(nodeId) {
  const File = require("../models/File");   // required here to avoid a load cycle
  let names;
  try {
    names = await fsp.readdir(nodePath(nodeId));
  } catch {
    return 0;                               // folder missing: nothing to sweep
  }
  const files = await File.find({ "chunks.nodes": nodeId }, { chunks: 1 }).lean();
  const keep = new Set();
  for (const f of files) {
    for (const c of f.chunks) {
      if (c.nodes.includes(nodeId)) keep.add(`${f._id}_${c.index}.chunk`);
    }
  }
  let removed = 0;
  for (const name of names) {
    if (name.endsWith(".chunk") && !keep.has(name)) {
      await fsp.rm(path.join(nodePath(nodeId), name), { force: true });
      removed++;
    }
  }
  return removed;
}

module.exports = { ensureNodes, availableIds, sweepOrphans };
