// client/src/replay.js
// Plays a download back on the storage map. The server does the real work
// and records what happened to each chunk copy (Activity events); this file
// downloads the file, fetches those events and turns them into "frames"
// the map shows one after another, plus the lines of the read log.
import { downloadFile, getDownloadLog } from "./api/files";
import { errorMessage } from "./api/client";
import { plural } from "./nodes";

const FAST = 30;    // ms per chunk read cleanly from its first copy
const SLOW = 950;   // ms per step that is worth watching

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sha256Hex(blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The server saves the events just after the last byte is sent, so wait
// until a newer entry than `before` appears.
async function waitForNewLog(fileId, before) {
  for (let i = 0; i < 15; i++) {
    const log = await getDownloadLog(fileId);
    if (log.createdAt && log.createdAt !== before) return log;
    await sleep(300);
  }
  return { events: [] };
}

// One frame = the map highlights one copy of one chunk.
// kind is "ok" (read and verified), "NODE_OFFLINE", "COPY_MISSING",
// "HASH_MISMATCH" or "REPAIRED".
// Repeats of the same fault (e.g. 20 chunks whose first copy is on an
// offline node) are shown slowly twice, then run fast with no log line,
// and a single summary line is added at the end.
const SHOW_SLOWLY = 2;
const QUICK = 140;

export function buildFrames(chunks, events) {
  const byChunk = new Map();
  for (const ev of events) {
    if (!byChunk.has(ev.chunk)) byChunk.set(ev.chunk, []);
    byChunk.get(ev.chunk).push(ev);
  }
  const frames = [];
  const seen = {};      // "NODE_OFFLINE:node2" -> how many chunks so far
  const quiet = {};     // same key -> { count, servedFrom }
  for (const chunk of [...chunks].sort((a, b) => a.index - b.index)) {
    const n = chunk.index + 1;
    const evs = byChunk.get(chunk.index);
    if (!evs) {
      frames.push({ chunk: chunk.index, node: chunk.copies[0].node, kind: "ok", clean: true, delay: FAST });
      continue;
    }
    const faults = evs.filter((e) => e.type !== "REPAIRED");
    const repairs = evs.filter((e) => e.type === "REPAIRED");
    // Only plain "node is offline" falls back are repetitive; damage and
    // repairs are always shown in full.
    const key = faults.length === 1 && faults[0].type === "NODE_OFFLINE" && !repairs.length
      ? `NODE_OFFLINE:${faults[0].node}` : null;
    if (key) seen[key] = (seen[key] || 0) + 1;
    const isQuiet = key && seen[key] > SHOW_SLOWLY;
    const delay = isQuiet ? QUICK : SLOW;

    const failed = [];
    for (const ev of faults) {
      failed.push(ev.node);
      const text = {
        NODE_OFFLINE: `Chunk ${n}: ${ev.node} is offline.`,
        COPY_MISSING: `Chunk ${n}: no copy found on ${ev.node}.`,
        HASH_MISMATCH: `Chunk ${n}: hash mismatch on ${ev.node}, copy is damaged.`,
      }[ev.type];
      frames.push({ chunk: chunk.index, node: ev.node, kind: ev.type, delay,
                    line: isQuiet ? null : text, tone: "warn" });
    }
    const served = chunk.copies.find((c) => !failed.includes(c.node))?.node;
    if (served) {
      frames.push({ chunk: chunk.index, node: served, kind: "ok", delay,
                    line: isQuiet ? null : `Chunk ${n}: read the copy on ${served}, hash verified.` });
    }
    if (isQuiet) {
      quiet[key] = quiet[key] || { count: 0, from: new Set() };
      quiet[key].count++;
      quiet[key].from.add(served);
    }
    for (const ev of repairs) {
      frames.push({ chunk: chunk.index, node: ev.node, kind: "REPAIRED", tone: "ok", delay: SLOW,
                    line: `Chunk ${n}: repaired the copy on ${ev.node} from ${ev.from}.` });
    }
  }
  for (const [key, q] of Object.entries(quiet)) {
    const node = key.split(":")[1];
    frames.push({ chunk: null, delay: 0, tone: "warn",
                  line: `${plural(q.count, "more chunk")} had a copy on ${node}, which is offline; ` +
                        `read from ${[...q.from].join(" and ")}, hashes verified.` });
  }
  return frames;
}

// Downloads `file` (an entry from /api/files/map) and plays it back.
// setReplay drives the map, setLog drives the read log.
export async function runDownload(file, { save, setReplay, setLog }) {
  const n = file.chunks.length;
  const lines = [];
  const show = (status) => setLog({ fileName: file.name, lines: [...lines], status });
  const push = (text, tone = "") => { lines.push({ text, tone }); show("running"); };

  setReplay({ fileId: file.id, frame: null, read: new Set(), healed: new Set(), blocked: new Set() });
  push("Token verified. You own this file.");
  push(`Found ${plural(n, "chunk")} in metadata.`);

  const before = (await getDownloadLog(file.id)).createdAt;
  let blob;
  try {
    blob = await downloadFile(file.id, file.name, { save });
  } catch (err) {
    // Show which chunks have no reachable copy (the reason for a 503).
    const blocked = new Set(file.chunks
      .filter((c) => c.copies.every((x) => x.state === "offline"))
      .map((c) => c.index));
    setReplay((r) => ({ ...r, blocked }));
    push(`Download refused: ${errorMessage(err)}.`, "fault");
    show("failed");
    await sleep(2500);
    setReplay(null);
    return;
  }

  const log = await waitForNewLog(file.id, before);
  const read = new Set();
  const healed = new Set();
  let clean = 0;
  for (const frame of buildFrames(file.chunks, log.events)) {
    const key = `${frame.chunk}:${frame.node}`;
    if (frame.kind === "ok") read.add(key);
    if (frame.kind === "REPAIRED") healed.add(key);
    if (frame.clean) clean++;
    setReplay((r) => ({ ...r, frame, read: new Set(read), healed: new Set(healed) }));
    if (frame.line) push(frame.line, frame.tone);
    await sleep(frame.delay);
  }

  const hashOk = (await sha256Hex(blob)) === file.fileHash;
  push(`${clean} of ${plural(n, "chunk")} read from their first copy, hashes verified.`);
  push(hashOk
    ? `Reassembled ${plural(n, "chunk")} in order. File hash matches.`
    : `Reassembled ${plural(n, "chunk")}, but the file hash does not match.`,
  hashOk ? "ok" : "fault");
  setReplay((r) => ({ ...r, frame: null }));
  show(hashOk ? "done" : "failed");
  await sleep(1400);
  setReplay(null);
}
