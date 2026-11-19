const multer = require("multer");

const jwtErrorNames = new Set([
  "JsonWebTokenError",
  "TokenExpiredError",
  "NotBeforeError",
]);

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || "Internal server error";

  if (error.name === "CastError" || error.name === "ValidationError") {
    statusCode = 400;
  } else if (error.code === 11000) {
    statusCode = 409;
    message = "A record with this value already exists";
  } else if (jwtErrorNames.has(error.name)) {
    statusCode = 401;
    message = "Invalid or expired token";
  } else if (error instanceof multer.MulterError) {
    statusCode = 400;
    message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file exceeds the size limit"
        : error.message;
  }

  if (statusCode >= 500 && process.env.NODE_ENV === "production") {
    message = "Internal server error";
  }

  const response = { success: false, message };
  if (process.env.NODE_ENV !== "production" && error.stack) {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
