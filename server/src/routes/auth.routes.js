// server/src/routes/auth.routes.js
const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const auth = require("../controllers/auth.controller");

router.post("/register", auth.register);
router.post("/login", auth.login);
router.get("/me", requireAuth, auth.me);

module.exports = router;
