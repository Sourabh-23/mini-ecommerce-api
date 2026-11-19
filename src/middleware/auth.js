const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const unauthorized = (res) =>
  res.status(401).json({ success: false, message: "Unauthorized" });

const protect = asyncHandler(async (req, res, next) => {
  const authorization = req.get("Authorization");
  const bearerMatch =
    typeof authorization === "string" &&
    authorization.match(/^Bearer\s+(\S+)$/i);
  const token = bearerMatch && bearerMatch[1];

  if (!token) {
    return unauthorized(res);
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return unauthorized(res);
  }

  if (!payload || typeof payload !== "object" || !payload.id) {
    return unauthorized(res);
  }

  const user = await User.findById(payload.id);
  if (!user) {
    return unauthorized(res);
  }

  req.user = user;
  return next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  return next();
};

module.exports = { protect, authorize };
