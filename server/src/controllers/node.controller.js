// server/src/controllers/node.controller.js
const Node = require("../models/Node");
const File = require("../models/File");
const Activity = require("../models/Activity");
const nodeManager = require("../storage/nodeManager");
const { NODE_IDS } = require("../config/storage");
const store = require("../storage/store");
const { chunkName } = require("../storage/chunker");
const { sha256 } = require("../storage/integrity");
const { inspectFile, healthOfCopies } = require("../storage/inspector");

// GET /api/nodes: status, chunk copies, space used and damaged copies
// for every node, plus a file availability summary.
exports.status = async (req, res) => {
  const records = await Node.find().lean();
  const available = await nodeManager.availableIds();
  const files = await File.find({}, { chunks: 1 }).lean();

  // Copies and space come from the metadata, so an offline node still shows
  // what it holds. Damaged/missing can only be checked on a reachable node,
  // so they are null (not checked) when it is down.
  const nodes = {};
  for (const id of NODE_IDS) {
    const reachable = available.includes(id);
    nodes[id] = {
      id,
      online: records.find((r) => r.nodeId === id)?.online ?? false,
      available: reachable,
      path: `/storage/${id}`,
      chunkCount: 0,
      bytesUsed: 0,
      damaged: reachable ? 0 : null,
      missing: reachable ? 0 : null,
    };
  }

  const summary = { ok: 0, single: 0, unavailable: 0 };
  for (const f of files) {
    const chunks = await inspectFile(f, available);
    summary[healthOfCopies(chunks)]++;
    for (const c of chunks) {
      for (const { node, state } of c.copies) {
        nodes[node].chunkCount++;
        nodes[node].bytesUsed += c.size;
        if (state === "damaged") nodes[node].damaged++;
        if (state === "missing") nodes[node].missing++;
      }
    }
  }

  res.json({ nodes: NODE_IDS.map((id) => nodes[id]), files: summary });
};

// PATCH /api/nodes/:id  body { online: true | false }
exports.setOnline = async (req, res) => {
  if (!NODE_IDS.includes(req.params.id))
    return res.status(404).json({ error: "Node not found" });
  if (typeof req.body?.online !== "boolean")
    return res.status(400).json({ error: "online must be true or false" });

  const online = req.body.online;
  await Node.updateOne({ nodeId: req.params.id }, { online });
  const swept = online ? await nodeManager.sweepOrphans(req.params.id) : 0;
  await Activity.record(req.user.id, null, online ? "NODE_ONLINE" : "NODE_OFFLINE",
                        [], { node: req.params.id });
  res.json({ id: req.params.id, online, orphansRemoved: swept });
};

// POST /api/nodes/:id/damage: flip one byte of one chunk copy on this
// node so the integrity check and self-healing can be shown live.
// Optional body { file: id } picks the file (used by the demo scenario).
exports.damage = async (req, res) => {
  if (process.env.DEMO_MODE !== "true")
    return res.status(403).json({ error: "Demo mode is off" });
  const id = req.params.id;
  if (!NODE_IDS.includes(id)) return res.status(404).json({ error: "Node not found" });

  // Damage a copy that downloads read first (this node is the chunk's first
  // node), so the next download detects the damage and repairs it.
  const filter = { "chunks.nodes.0": id };
  if (req.body?.file) filter._id = req.body.file;
  const files = await File.find(filter);
  for (const file of files) {
    for (const c of file.chunks) {
      if (c.nodes[0] !== id) continue;
      const name = chunkName(file._id, c.index);
      let buf;
      try { buf = await store.read(id, name); } catch { continue; }
      if (sha256(buf) !== c.hash) continue;          // already damaged
      buf[0] ^= 0xff;                                  // flip one byte
      await store.write(id, name, buf);
      await Activity.record(req.user.id, file, "DAMAGE", [], { node: id, chunk: c.index });
      return res.json({ node: id, file: file.name, fileId: file._id, chunk: c.index });
    }
  }
  res.status(404).json({ error: "No healthy chunk copy on this node to damage" });
};
