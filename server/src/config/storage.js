// server/src/config/storage.js
const path = require("path");
const ROOT = path.join(__dirname, "..", "..", "storage");

module.exports = {
  CHUNK_SIZE: 1024 * 1024,          // 1 MB per chunk
  REPLICATION_FACTOR: 2,            // copies of every chunk
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100 MB upload limit
  NODE_IDS: ["node1", "node2", "node3", "node4"],
  nodePath: (id) => path.join(ROOT, id),
  TMP_DIR: path.join(ROOT, "tmp"),
};
