// server/src/services/fileService.js
// The two things both a normal upload/download and a phone transfer need:
// store an uploaded temp file as chunks, and stream a stored file back.
// They take the owner as an argument instead of reading req.user, so the
// same code serves logged-in requests and one-time transfer links.
const fsp = require("fs/promises");
const mongoose = require("mongoose");
const File = require("../models/File");
const Activity = require("../models/Activity");
const nodeManager = require("../storage/nodeManager");
const { CHUNK_SIZE } = require("../config/storage");
const { splitAndStore } = require("../storage/chunker");
const { hashFile } = require("../storage/integrity");
const { streamFile } = require("../storage/reassembler");

// Splits `tempFile` (a Multer file) into chunks, stores two copies of each,
// saves the File document and records activity. Always deletes the temp file.
// Throws NO_NODES_AVAILABLE if no node is up.
async function storeUploadedFile(tempFile, ownerId, action = "UPLOAD") {
  const fileId = new mongoose.Types.ObjectId();
  try {
    const available = await nodeManager.availableIds();
    const chunks = await splitAndStore(tempFile.path, fileId, available);
    const file = await File.create({
      _id: fileId,
      owner: ownerId,
      name: tempFile.originalname,
      size: tempFile.size,
      mimeType: tempFile.mimetype,
      chunkSize: CHUNK_SIZE,
      fileHash: await hashFile(tempFile.path),
      chunks,
    });
    await Activity.record(ownerId, file, action);
    return { file, available };
  } finally {
    await fsp.rm(tempFile.path, { force: true });   // remove temp file
  }
}

// Checks every chunk has a reachable copy (else 503), then streams the file.
// Returns true if the whole file was sent, false if it was refused or broke
// off, so callers can decide whether a one-time link may be used again.
async function sendStoredFile(file, userId, res, action = "DOWNLOAD") {
  const available = await nodeManager.availableIds();
  const blocked = file.chunks.find(
    (c) => !c.nodes.some((id) => available.includes(id))
  );
  if (blocked) {
    res.status(503).json({
      error: `Chunk ${blocked.index + 1} has no copy on an available node`,   // numbered from 1, like the UI
    });
    return false;
  }

  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Length", file.size);
  res.setHeader("Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);

  const events = [];
  let sent = false;
  try {
    await streamFile(file, available, res, events);
    sent = true;
  } catch (err) {
    res.destroy(err);              // client sees an interrupted download
  } finally {
    await Activity.record(userId, file, action, events);
  }
  return sent;
}

module.exports = { storeUploadedFile, sendStoredFile };
