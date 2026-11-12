// server/src/controllers/file.controller.js
const fsp = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const File = require("../models/File");
const Node = require("../models/Node");
const Activity = require("../models/Activity");
const nodeManager = require("../storage/nodeManager");
const { CHUNK_SIZE, nodePath } = require("../config/storage");
const { splitAndStore, chunkName } = require("../storage/chunker");
const { hashFile } = require("../storage/integrity");
const { streamFile } = require("../storage/reassembler");
const { inspectFile, healthOfCopies } = require("../storage/inspector");
const { NODE_IDS } = require("../config/storage");

// Every query filters by owner, so another user's file is simply "not found".
const findOwn = (req) => File.findOne({ _id: req.params.id, owner: req.user.id });

exports.list = async (req, res) => {
  const available = await nodeManager.availableIds();
  const files = await File.find({ owner: req.user.id }).sort({ createdAt: -1 });
  res.json(files.map((f) => f.toSummary(available)));
};

// GET /api/files/map: the user's files with the state of every chunk copy,
// plus the status of each node. Drives the storage map on the main screen.
exports.map = async (req, res) => {
  const available = await nodeManager.availableIds();
  const records = await Node.find().lean();
  const files = await File.find({ owner: req.user.id }).sort({ createdAt: -1 });
  const out = [];
  for (const f of files) {
    const chunks = await inspectFile(f, available);
    out.push({ ...f.toSummary(available), health: healthOfCopies(chunks),
               fileHash: f.fileHash, chunks });
  }
  res.json({
    availableNodes: available,
    nodes: NODE_IDS.map((id) => ({
      id,
      online: records.find((r) => r.nodeId === id)?.online ?? false,
      available: available.includes(id),
    })),
    files: out,
  });
};

exports.upload = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received" });
  const fileId = new mongoose.Types.ObjectId();
  try {
    const available = await nodeManager.availableIds();
    const chunks = await splitAndStore(req.file.path, fileId, available);
    const file = await File.create({
      _id: fileId,
      owner: req.user.id,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      chunkSize: CHUNK_SIZE,
      fileHash: await hashFile(req.file.path),
      chunks,
    });
    await Activity.record(req.user.id, file, "UPLOAD");
    res.status(201).json({ ...file.toSummary(available), chunks: file.chunks });
  } catch (err) {
    if (err.message === "NO_NODES_AVAILABLE")
      return res.status(503).json({ error: "No storage node is available" });
    throw err;
  } finally {
    await fsp.rm(req.file.path, { force: true });   // remove temp file
  }
};

// Full metadata (the MongoDB document) plus health, for the chunk map.
exports.details = async (req, res) => {
  const file = await findOwn(req);
  if (!file) return res.status(404).json({ error: "File not found" });
  const available = await nodeManager.availableIds();
  res.json({ ...file.toSummary(available), availableNodes: available,
             document: file.toObject() });
};

exports.download = async (req, res) => {
  const file = await findOwn(req);
  if (!file) return res.status(404).json({ error: "File not found" });

  const available = await nodeManager.availableIds();
  const blocked = file.chunks.find(
    (c) => !c.nodes.some((id) => available.includes(id))
  );
  if (blocked) {
    return res.status(503).json({
      error: `Chunk ${blocked.index + 1} has no copy on an available node`,   // numbered from 1, like the UI
    });
  }

  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Length", file.size);
  res.setHeader("Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);

  const events = [];
  try {
    await streamFile(file, available, res, events);
  } catch (err) {
    res.destroy(err);              // client sees an interrupted download
  } finally {
    await Activity.record(req.user.id, file, "DOWNLOAD", events);
  }
};

exports.remove = async (req, res) => {
  const file = await File.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!file) return res.status(404).json({ error: "File not found" });
  // Delete every copy. A copy that can't be deleted now (folder missing)
  // becomes an orphan and is swept when its node comes back online.
  for (const chunk of file.chunks) {
    for (const id of chunk.nodes) {
      await fsp.rm(path.join(nodePath(id), chunkName(file._id, chunk.index)),
                   { force: true }).catch(() => {});
    }
  }
  await Activity.record(req.user.id, file, "DELETE");
  res.status(204).end();
};

// The steps of the user's most recent download of this file, for the
// download log dialog (Fig 6.7).
exports.lastDownload = async (req, res) => {
  const file = await findOwn(req);
  if (!file) return res.status(404).json({ error: "File not found" });
  const activity = await Activity.findOne({ file: file._id, user: req.user.id,
                                            action: "DOWNLOAD" }).sort({ createdAt: -1 });
  res.json({ chunkCount: file.chunks.length, events: activity?.events || [],
             createdAt: activity?.createdAt });
};
