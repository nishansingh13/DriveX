// server/src/middleware/errorHandler.js
// Express 5 sends any error thrown in an async route here automatically.
// It turns every error into a JSON response: { error: "message" }.
const { MAX_FILE_SIZE } = require("../config/storage");

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  // Multer: file larger than the upload limit
  if (err.code === "LIMIT_FILE_SIZE") {
    const mb = MAX_FILE_SIZE / (1024 * 1024);
    return res.status(413).json({ error: `File is larger than ${mb} MB` });
  }
  // Mongoose: an id in the URL that is not a valid ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid id" });
  }
  // Mongoose: a schema rule failed (for example a required field)
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Something went wrong" });
};
