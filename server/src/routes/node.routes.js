// server/src/routes/node.routes.js
const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const nodes = require("../controllers/node.controller");

router.use(requireAuth, requireAdmin);
router.get("/", nodes.status);
router.patch("/:id", nodes.setOnline);
router.post("/:id/damage", nodes.damage);

module.exports = router;
