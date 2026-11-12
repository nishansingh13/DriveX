// server/src/middleware/upload.js
// Multer saves the uploaded file to storage/tmp. Files over 100 MB are
// stopped with a LIMIT_FILE_SIZE error, which errorHandler turns into 413.
const multer = require("multer");
const { TMP_DIR, MAX_FILE_SIZE } = require("../config/storage");

module.exports = multer({
  dest: TMP_DIR,
  limits: { fileSize: MAX_FILE_SIZE },
});
