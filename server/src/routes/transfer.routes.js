// server/src/routes/transfer.routes.js
const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const requireAuth = require("../middleware/auth");
const transferUpload = require("../middleware/transferUpload");
const transfers = require("../controllers/transfer.controller");

// The public routes need no login, so each address gets only a few tries.
const publicLimit = rateLimit({
  windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests. Wait a minute and try again." },
});

// Logged-in side (the laptop)
router.post("/", requireAuth, transfers.create);
router.get("/:token/status", requireAuth, transfers.status);
router.delete("/:token", requireAuth, transfers.cancel);

// Public side (the phone). "/public/" keeps these apart from the routes above.
router.get("/public/:token", publicLimit, transfers.info);
router.post("/public/:token/upload", publicLimit, transferUpload.single("file"), transfers.receive);
router.get("/public/:token/download", publicLimit, transfers.send);

module.exports = router;
