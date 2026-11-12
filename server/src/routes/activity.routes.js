// server/src/routes/activity.routes.js
const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const activity = require("../controllers/activity.controller");

router.get("/", requireAuth, activity.list);

module.exports = router;
