// server/src/models/Transfer.js
// A one-time link, shown to a phone as a QR code.
//   direction "receive": the phone uploads one file INTO the owner's account
//   direction "send":    the phone downloads ONE of the owner's files
// The link can do that single job and nothing else.
const mongoose = require("mongoose");

const TRANSFER_TTL_MS = 5 * 60 * 1000;          // a link lives for 5 minutes
const TRANSFER_MAX_BYTES = 20 * 1024 * 1024;    // phone uploads are capped at 20 MB

const transferSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },   // 32 random bytes, hex
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  direction: { type: String, enum: ["receive", "send"], required: true },
  file: { type: mongoose.Schema.Types.ObjectId, ref: "File" },   // "send": which file
  status: { type: String, enum: ["waiting", "done", "cancelled"], default: "waiting" },
  receivedFile: { type: mongoose.Schema.Types.ObjectId, ref: "File" },   // "receive": what arrived
  receivedName: String,
  receivedSize: Number,
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

// MongoDB deletes the record shortly after it expires (cleanup only: the
// expiry is also checked on every request, because that cleanup is not instant).
transferSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

const Transfer = mongoose.model("Transfer", transferSchema);
Transfer.TRANSFER_TTL_MS = TRANSFER_TTL_MS;
Transfer.TRANSFER_MAX_BYTES = TRANSFER_MAX_BYTES;
module.exports = Transfer;
