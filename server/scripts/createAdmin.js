// server/scripts/createAdmin.js
// Creates an admin account, or makes an existing account an admin.
// Usage (from the server folder):  node scripts/createAdmin.js admin@drivex.local secret123
require("dotenv").config({ quiet: true });
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../src/models/User");

(async () => {
  const [email, password] = process.argv.slice(2);
  if (!email || !password || password.length < 6) {
    console.log("Usage: node scripts/createAdmin.js <email> <password (6+ chars)>");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: "admin", passwordHash: await bcrypt.hash(password, 10) },
    { upsert: true }
  );
  console.log(`Admin ready: ${email}`);
  await mongoose.disconnect();
})();
