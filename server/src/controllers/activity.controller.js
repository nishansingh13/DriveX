// server/src/controllers/activity.controller.js
const Activity = require("../models/Activity");

// GET /api/activity: the 50 most recent entries. Users see their own;
// admins see everyone's (with the user's email).
exports.list = async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { user: req.user.id };
  const items = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("user", "email")
    .lean();
  res.json(items.map((a) => ({ ...a, user: a.user?.email })));
};
