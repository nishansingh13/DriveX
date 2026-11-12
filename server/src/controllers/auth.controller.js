// server/src/controllers/auth.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Signs a token holding the user's id (sub) and role, valid for 1 day.
function makeToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
}

const publicUser = (user) => ({ id: user.id, email: user.email, role: user.role });

exports.register = async (req, res) => {
  const { email, password } = req.body || {};
  if (!EMAIL_RE.test(String(email || ""))) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }
  if (String(password || "").length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const exists = await User.exists({ email: String(email).toLowerCase() });
  if (exists) return res.status(409).json({ error: "Email is already registered" });

  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash(String(password), 10),   // cost factor 10
  });
  res.status(201).json({ token: makeToken(user), user: publicUser(user) });
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email).toLowerCase() });
  const ok = user && (await bcrypt.compare(String(password), user.passwordHash));
  if (!ok) return res.status(401).json({ error: "Email or password is incorrect" });

  res.json({ token: makeToken(user), user: publicUser(user) });
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ error: "Login required" });
  res.json({ user: publicUser(user) });
};
