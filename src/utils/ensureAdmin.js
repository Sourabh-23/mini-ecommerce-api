const User = require("../models/User");

const ensureAdmin = async () => {
  const missingVariables = [
    "ADMIN_NAME",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
  ].filter((name) => !process.env[name]);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missingVariables.join(", ")}`
    );
  }

  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return;
  }

  const admin = new User({
    name: process.env.ADMIN_NAME,
    email,
    password: process.env.ADMIN_PASSWORD,
    role: "admin",
  });

  // Save the plain password so the model hook hashes it.
  await admin.save();
  console.log(`Admin created: ${email}`);
};

module.exports = ensureAdmin;
