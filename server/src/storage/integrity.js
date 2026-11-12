// server/src/storage/integrity.js
const crypto = require("crypto");
const fs = require("fs");

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

async function hashFile(filePath) {
  const hash = crypto.createHash("sha256");
  for await (const part of fs.createReadStream(filePath)) hash.update(part);
  return hash.digest("hex");
}

module.exports = { sha256, hashFile };
