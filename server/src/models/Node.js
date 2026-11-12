// server/src/models/Node.js
const mongoose = require("mongoose");
const { NODE_IDS } = require("../config/storage");

const nodeSchema = new mongoose.Schema({
  nodeId: { type: String, enum: NODE_IDS, required: true, unique: true },
  online: { type: Boolean, default: true },
});

module.exports = mongoose.model("Node", nodeSchema);
