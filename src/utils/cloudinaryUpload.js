const cloudinary = require("../config/cloudinary");

const uploadImage = (buffer) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: process.env.CLOUDINARY_FOLDER },
        (error, result) => {
          if (error) {
            return reject(error);
          }

          if (!result || !result.secure_url || !result.public_id) {
            return reject(new Error("Cloudinary returned an invalid upload result"));
          }

          return resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      )
      .end(buffer);
  });

const deleteImage = (publicId) => cloudinary.uploader.destroy(publicId);

module.exports = { uploadImage, deleteImage };
