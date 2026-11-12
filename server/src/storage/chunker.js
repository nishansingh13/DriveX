// server/src/storage/chunker.js
const fs = require("fs");
const { CHUNK_SIZE } = require("../config/storage");
const store = require("./store");
const { chooseNodes } = require("./placement");
const { sha256 } = require("./integrity");

const chunkName = (fileId, index) => `${fileId}_${index}.chunk`;

async function splitAndStore(tempPath, fileId, availableIds) {
  if (availableIds.length === 0) throw new Error("NO_NODES_AVAILABLE");
  const stream = fs.createReadStream(tempPath, { highWaterMark: CHUNK_SIZE });
  const chunks = [];
  let index = 0;
  for await (const buf of stream) {
    const nodes = chooseNodes(index, availableIds);
    const name = chunkName(fileId, index);
    await Promise.all(
      nodes.map((id) => store.write(id, name, buf))
    );
    chunks.push({ index, size: buf.length, hash: sha256(buf), nodes });
    index++;
  }
  return chunks;
}

module.exports = { chunkName, splitAndStore };
