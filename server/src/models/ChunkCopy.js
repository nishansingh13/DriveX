// server/src/models/ChunkCopy.js
// Used only when STORAGE_BACKEND=mongo. One document = one copy of one chunk
// on one node, the same thing a .chunk file is in the folder version.
// Metadata (hashes, which nodes) still lives in the File document.
const mongoose = require("mongoose");
const { NODE_IDS } = require("../config/storage");

const chunkCopySchema = new mongoose.Schema({
  node: { type: String, enum: NODE_IDS, required: true },
  name: { type: String, required: true },          // <fileId>_<index>.chunk
  data: { type: Buffer, required: true },
});

// One copy of a given chunk per node.
chunkCopySchema.index({ node: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("ChunkCopy", chunkCopySchema);
