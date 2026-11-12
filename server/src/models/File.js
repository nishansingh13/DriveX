// server/src/models/File.js
const mongoose = require("mongoose");
const { NODE_IDS, REPLICATION_FACTOR } = require("../config/storage");

const chunkSchema = new mongoose.Schema({
  index: { type: Number, required: true },
  size:  { type: Number, required: true },
  hash:  { type: String, required: true },          // SHA-256 (hex)
  nodes: [{ type: String, enum: NODE_IDS }],         // where copies live
}, { _id: false });

const fileSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User",
           required: true, index: true },
  name:      { type: String, required: true, trim: true },
  size:      { type: Number, required: true },
  mimeType:  { type: String, default: "application/octet-stream" },
  chunkSize: { type: Number, required: true },
  fileHash:  { type: String, required: true },
  chunks:    [chunkSchema],
}, { timestamps: true });

// Storage health of a file, given the nodes that are available right now:
//   "ok"          every chunk has 2 reachable copies
//   "single"      every chunk is reachable, but some have only 1 copy
//   "unavailable" at least one chunk has no reachable copy
function healthOf(chunks, availableIds) {
  let health = "ok";
  for (const c of chunks) {
    const reachable = c.nodes.filter((id) => availableIds.includes(id)).length;
    if (reachable === 0) return "unavailable";
    if (reachable < REPLICATION_FACTOR) health = "single";
  }
  return health;
}

// The short form of a file used in lists (no chunk records).
fileSchema.methods.toSummary = function (availableIds = NODE_IDS) {
  return {
    id: this._id,
    name: this.name,
    size: this.size,
    mimeType: this.mimeType,
    chunkCount: this.chunks.length,
    health: healthOf(this.chunks, availableIds),
    createdAt: this.createdAt,
  };
};

const File = mongoose.model("File", fileSchema);
File.healthOf = healthOf;
module.exports = File;
