// server/src/storage/placement.js
const { NODE_IDS, REPLICATION_FACTOR } = require("../config/storage");

function chooseNodes(chunkIndex, availableIds) {
  const n = NODE_IDS.length;
  const chosen = [];
  for (let k = 0; k < n && chosen.length < REPLICATION_FACTOR; k++) {
    const id = NODE_IDS[(chunkIndex + k) % n];
    if (availableIds.includes(id)) chosen.push(id);
  }
  return chosen;
}

module.exports = { chooseNodes };
