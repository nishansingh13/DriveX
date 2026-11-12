// server/src/routes/file.routes.js
const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const upload = require("../middleware/upload");   // multer, 100 MB limit
const files = require("../controllers/file.controller");

router.use(requireAuth);
router.get("/", files.list);
router.get("/map", files.map);            // before "/:id" so "map" is not read as an id
router.post("/upload", upload.single("file"), files.upload);
router.get("/:id", files.details);
router.get("/:id/download", files.download);
router.get("/:id/download-log", files.lastDownload);
router.delete("/:id", files.remove);

module.exports = router;
