// server/src/storage/reassembler.js
const crypto = require("crypto");
const { once } = require("events");
const store = require("./store");
const { chunkName } = require("./chunker");
const { sha256 } = require("./integrity");

async function readChunk(fileId, chunk, availableIds, events) {
  const name = chunkName(fileId, chunk.index);
  const bad = [];                                   // copies that failed
  for (const id of chunk.nodes) {
    if (!availableIds.includes(id)) {
      events.push({ type: "NODE_OFFLINE", chunk: chunk.index, node: id });
      continue;
    }
    try {
      const buf = await store.read(id, name);
      if (sha256(buf) === chunk.hash) {
        for (const badId of bad) {                  // self-healing
          await store.write(badId, name, buf);
          events.push({ type: "REPAIRED", chunk: chunk.index,
                        node: badId, from: id });
        }
        return buf;
      }
      events.push({ type: "HASH_MISMATCH", chunk: chunk.index, node: id });
    } catch {
      events.push({ type: "COPY_MISSING", chunk: chunk.index, node: id });
    }
    bad.push(id);
  }
  throw new Error(`CHUNK_UNREADABLE:${chunk.index}`);
}

// Streams every chunk in order and returns the SHA-256 of all bytes sent,
// so the controller can compare it with the whole-file hash.
async function streamFile(file, availableIds, res, events) {
  const ordered = [...file.chunks].sort((a, b) => a.index - b.index);
  const fileHash = crypto.createHash("sha256");
  for (const chunk of ordered) {
    const buf = await readChunk(file._id, chunk, availableIds, events);
    fileHash.update(buf);
    if (!res.write(buf)) await once(res, "drain");   // back-pressure
  }
  res.end();
  return fileHash.digest("hex");
}

module.exports = { readChunk, streamFile };
