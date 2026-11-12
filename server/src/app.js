// server/src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const nodeManager = require("./storage/nodeManager");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(helmet());                                     // safe HTTP headers
app.use(cors({ origin: process.env.CLIENT_ORIGIN,     // allow the React app
  exposedHeaders: ["Content-Disposition"] }));
app.use(express.json());                               // read JSON bodies

// Test route: shows the server is up and which nodes are available
app.get("/api/health", async (req, res) => {
  res.json({ status: "ok", availableNodes: await nodeManager.availableIds() });
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/files", require("./routes/file.routes"));
app.use("/api/nodes", require("./routes/node.routes"));
app.use("/api/activity", require("./routes/activity.routes"));

// Any other /api URL
app.use("/api", (req, res) => res.status(404).json({ error: "Route not found" }));

app.use(errorHandler);                                 // must be last

module.exports = app;
