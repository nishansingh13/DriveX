// server/src/middleware/transferUpload.js
// Multer for phone uploads: same temp folder, but capped at 20 MB (the
// shared limit in the Transfer model), not the 100 MB of a normal upload.
const multer = require("multer");
const { TMP_DIR } = require("../config/storage");
const { TRANSFER_MAX_BYTES } = require("../models/Transfer");

module.exports = multer({ dest: TMP_DIR, limits: { fileSize: TRANSFER_MAX_BYTES, files: 1 } });
