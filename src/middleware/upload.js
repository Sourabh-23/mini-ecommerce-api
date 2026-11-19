const multer = require("multer");

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const hasValidSignature = (file) => {
  const { buffer, mimetype } = file;

  if (mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }

  if (mimetype === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }

  return (
    mimetype === "image/webp" &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error("Only JPEG, PNG, and WebP images are allowed");
      error.statusCode = 400;
      return callback(error);
    }

    return callback(null, true);
  },
}).single("image");

const uploadImage = (req, res, next) => {
  upload(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        error.statusCode = 400;
      }
      return next(error);
    }

    if (req.file && !hasValidSignature(req.file)) {
      const invalidImage = new Error("Image content does not match its file type");
      invalidImage.statusCode = 400;
      return next(invalidImage);
    }

    return next();
  });
};

module.exports = uploadImage;
