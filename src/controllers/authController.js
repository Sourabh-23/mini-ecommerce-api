const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { signToken } = require("../utils/token");

const invalidCredentials = (res) =>
  res.status(401).json({
    success: false,
    message: "Invalid email or password",
  });

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const validPassword =
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password);

  if (normalizedName.length < 2 || !validEmail || !validPassword) {
    return res.status(400).json({
      success: false,
      message:
        "Provide a name, valid email, and password with at least 8 characters, including a letter and a number",
    });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res
      .status(409)
      .json({ success: false, message: "Email already registered" });
  }

  const user = new User({
    name: normalizedName,
    email: normalizedEmail,
    password,
    role: "user",
  });

  try {
    await user.save();
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }
    throw error;
  }

  return res.status(201).json({
    success: true,
    token: signToken(user._id),
    user: user.toJSON(),
  });
});

const login = asyncHandler(async (req, res) => {
  const email =
    req.body && typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const { password } = req.body || {};

  if (!email || typeof password !== "string") {
    return invalidCredentials(res);
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return invalidCredentials(res);
  }

  return res.json({
    success: true,
    token: signToken(user._id),
    user: user.toJSON(),
  });
});

const me = (req, res) =>
  res.json({ success: true, user: req.user.toJSON() });

module.exports = { register, login, me };
