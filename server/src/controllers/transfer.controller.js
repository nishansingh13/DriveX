// server/src/controllers/transfer.controller.js
// One-time phone transfers. Two groups of functions:
//   create / status / cancel   need a login: used by the laptop that shows the QR code
//   info / receive / send      are public but only work with a valid token
const crypto = require("crypto");
const File = require("../models/File");
const Transfer = require("../models/Transfer");
const User = require("../models/User");
const Activity = require("../models/Activity");
const nodeManager = require("../storage/nodeManager");
const { storeUploadedFile, sendStoredFile } = require("../services/fileService");

const { TRANSFER_TTL_MS } = Transfer;
const TOKEN_RE = /^[a-f0-9]{64}$/;

// The one answer for every bad token, so a visitor can't tell "never existed"
// from "already used" from "expired" from "wrong kind of link".
const GONE = { error: "This link has expired or was already used. Ask for a new QR code." };

// ---------- laptop side (logged in) ----------

// POST /api/transfers  body { direction: "receive" } or { direction: "send", fileId }
exports.create = async (req, res) => {
  const { direction, fileId } = req.body || {};
  if (!["receive", "send"].includes(direction)) {
    return res.status(400).json({ error: "direction must be receive or send" });
  }
  let file;
  if (direction === "send") {
    file = await File.findOne({ _id: fileId, owner: req.user.id });   // owner check, as everywhere
    if (!file) return res.status(404).json({ error: "File not found" });
  }
  // A person only needs one open link of each kind: cancel older waiting ones.
  await Transfer.updateMany({ owner: req.user.id, direction, status: "waiting" }, { status: "cancelled" });
  const transfer = await Transfer.create({
    token: crypto.randomBytes(32).toString("hex"),
    owner: req.user.id,
    direction,
    file: file?._id,
    expiresAt: new Date(Date.now() + TRANSFER_TTL_MS),
  });
  res.status(201).json({
    token: transfer.token,
    direction,
    expiresAt: transfer.expiresAt,
    maxBytes: Transfer.TRANSFER_MAX_BYTES,
    fileName: file?.name,
  });
};

// GET /api/transfers/:token/status  (owner only) polled by the laptop dialog
exports.status = async (req, res) => {
  const t = await Transfer.findOne({ token: String(req.params.token), owner: req.user.id });
  if (!t) return res.status(404).json({ error: "Transfer not found" });
  const expired = t.status === "waiting" && t.expiresAt < new Date();
  res.json({
    status: expired ? "expired" : t.status,
    expiresAt: t.expiresAt,
    receivedFile: t.status === "done" && t.direction === "receive"
      ? { id: t.receivedFile, name: t.receivedName, size: t.receivedSize } : undefined,
  });
};

// DELETE /api/transfers/:token  (owner only)
exports.cancel = async (req, res) => {
  await Transfer.updateOne(
    { token: String(req.params.token), owner: req.user.id, status: "waiting" },
    { status: "cancelled" });
  res.status(204).end();
};

// ---------- phone side (public, token only) ----------

// GET /api/transfers/public/:token  what should the phone page show?
exports.info = async (req, res) => {
  const token = String(req.params.token);
  if (!TOKEN_RE.test(token)) return res.status(404).json(GONE);
  const t = await Transfer.findOne({ token, status: "waiting", expiresAt: { $gt: new Date() } });
  if (!t) return res.status(404).json(GONE);
  const owner = await User.findById(t.owner, "email");
  const out = {
    direction: t.direction,
    owner: owner?.email.split("@")[0],        // only the part before @, never the whole address
    expiresAt: t.expiresAt,
  };
  if (t.direction === "receive") out.maxBytes = Transfer.TRANSFER_MAX_BYTES;
  if (t.direction === "send") {
    const f = await File.findById(t.file, "name size");
    out.file = f && { name: f.name, size: f.size };
  }
  res.json(out);
};

// POST /api/transfers/public/:token/upload  (multipart, field "file")
exports.receive = async (req, res) => {
  const file = req.file;
  try {
    if (!file) return res.status(400).json({ error: "No file received" });
    // Claim the link in ONE atomic step: only one request can flip "waiting" to
    // "done", so two phones scanning at once can't both upload.
    const token = String(req.params.token);
    const t = TOKEN_RE.test(token) && await Transfer.findOneAndUpdate(
      { token, direction: "receive", status: "waiting", expiresAt: { $gt: new Date() } },
      { status: "done", receivedName: file.originalname, receivedSize: file.size });
    if (!t) { await require("fs/promises").rm(file.path, { force: true }); return res.status(404).json(GONE); }

    try {
      const { file: stored } = await storeUploadedFile(file, t.owner, "TRANSFER_IN");
      await Transfer.updateOne({ _id: t._id }, { receivedFile: stored._id });
      return res.status(201).json({ name: stored.name, size: stored.size });
    } catch (err) {
      // Storing failed: give the link back so the person can try again.
      await Transfer.updateOne({ _id: t._id }, { status: "waiting", receivedName: null, receivedSize: null });
      if (err.message === "NO_NODES_AVAILABLE")
        return res.status(503).json({ error: "The storage drives are not available right now. Try again soon." });
      throw err;
    }
  } finally {
    // storeUploadedFile removes the temp file itself; this covers the early returns.
    if (file) await require("fs/promises").rm(file.path, { force: true });
  }
};

// GET /api/transfers/public/:token/download
exports.send = async (req, res) => {
  const token = String(req.params.token);
  if (!TOKEN_RE.test(token)) return res.status(404).json(GONE);

  // Claim the link in ONE atomic step, before sending anything, so a second
  // request arriving at the same moment finds it already taken.
  const t = await Transfer.findOneAndUpdate(
    { token, direction: "send", status: "waiting", expiresAt: { $gt: new Date() } },
    { status: "done" });
  if (!t) return res.status(404).json(GONE);

  const file = await File.findOne({ _id: t.file, owner: t.owner });
  if (!file) return res.status(404).json(GONE);

  // If the file could not be sent (a chunk has no reachable copy, or the
  // connection broke), give the link back so the person can try again.
  const sent = await sendStoredFile(file, t.owner, res, "TRANSFER_OUT");
  if (!sent) await Transfer.updateOne({ _id: t._id, expiresAt: { $gt: new Date() } }, { status: "waiting" });
};
