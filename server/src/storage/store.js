// server/src/storage/store.js
// The only place that knows where chunk copies physically live. The rest of
// the storage engine calls these five functions, so it works the same whether
// a node is a folder on disk or a set of documents in MongoDB.
//
//   STORAGE_BACKEND=folders  (default) each node is a folder of .chunk files
//   STORAGE_BACKEND=mongo    each node is the set of ChunkCopy documents with that node id
//
// A node "exists" when its folder exists (folders) or when it is switched on
// (mongo). Whether the node is also marked online is checked by nodeManager.
const fsp = require("fs/promises");
const path = require("path");
const { NODE_IDS, nodePath, TMP_DIR } = require("../config/storage");

const BACKEND = process.env.STORAGE_BACKEND === "mongo" ? "mongo" : "folders";

// ---- folders: the original behaviour -------------------------------------
const folders = {
  async init() {
    for (const id of NODE_IDS) await fsp.mkdir(nodePath(id), { recursive: true });
  },
  async nodeExists(node) {
    try { await fsp.access(nodePath(node)); return true; } catch { return false; }
  },
  async write(node, name, buf) {
    await fsp.writeFile(path.join(nodePath(node), name), buf);
  },
  async read(node, name) {                  // throws if the copy is missing
    return fsp.readFile(path.join(nodePath(node), name));
  },
  async remove(node, name) {
    await fsp.rm(path.join(nodePath(node), name), { force: true });
  },
  async list(node) {                        // all chunk names on this node
    try {
      return (await fsp.readdir(nodePath(node))).filter((n) => n.endsWith(".chunk"));
    } catch { return []; }
  },
};

// ---- mongo: every copy is a document -------------------------------------
const mongo = {
  async init() {},                          // nothing to create
  async nodeExists() { return true; },      // "removing the folder" has no equivalent here
  async write(node, name, buf) {
    const ChunkCopy = require("../models/ChunkCopy");   // loaded only if used
    await ChunkCopy.updateOne({ node, name }, { $set: { data: buf } }, { upsert: true });
  },
  async read(node, name) {
    const ChunkCopy = require("../models/ChunkCopy");
    const doc = await ChunkCopy.findOne({ node, name }).lean();
    if (!doc) throw new Error("COPY_MISSING");
    return Buffer.from(doc.data.buffer ?? doc.data);
  },
  async remove(node, name) {
    await require("../models/ChunkCopy").deleteOne({ node, name });
  },
  async list(node) {
    const docs = await require("../models/ChunkCopy").find({ node }, { name: 1 }).lean();
    return docs.map((d) => d.name);
  },
};

const store = BACKEND === "mongo" ? mongo : folders;

module.exports = { ...store, BACKEND, TMP_DIR };
