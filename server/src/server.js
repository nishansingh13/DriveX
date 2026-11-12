// server/src/server.js
require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const nodeManager = require("./storage/nodeManager");

(async () => {
  await connectDB();
  await nodeManager.ensureNodes();   // create folders and node records
  app.listen(process.env.PORT, () =>
    console.log(`DriveX API on port ${process.env.PORT}`));
})();
