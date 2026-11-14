// server/src/models/Activity.js
const mongoose = require("mongoose");
const { NODE_IDS } = require("../config/storage");

// One thing that happened to one chunk copy while a file was being read.
const eventSchema = new mongoose.Schema({
  type: { type: String, enum: ["NODE_OFFLINE", "COPY_MISSING", "HASH_MISMATCH", "REPAIRED"] },
  chunk: Number,                         // chunk index
  node: { type: String, enum: NODE_IDS },
  from: { type: String, enum: NODE_IDS }, // REPAIRED: the good copy used
}, { _id: false });

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  file: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
  fileName: String,                      // kept so deleted files still show a name
  node: { type: String, enum: NODE_IDS },  // node actions and DAMAGE
  chunk: Number,                         // DAMAGE: which chunk was damaged
  action: { type: String, required: true,
            enum: ["UPLOAD", "DOWNLOAD", "DELETE", "NODE_OFFLINE", "NODE_ONLINE", "DAMAGE", "TRANSFER_IN", "TRANSFER_OUT"] },
  events: [eventSchema],
}, { timestamps: { createdAt: true, updatedAt: false } });

// Small helper so controllers can write one line:
//   await Activity.record(req.user.id, file, "UPLOAD")
activitySchema.statics.record = function (userId, file, action, events = [], extra = {}) {
  return this.create({
    user: userId,
    file: file?._id,
    fileName: file?.name,
    action,
    events,
    ...extra,
  });
};

module.exports = mongoose.model("Activity", activitySchema);
