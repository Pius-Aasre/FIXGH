const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary under the fixgh-reports folder.
 *
 * @param {Buffer} fileBuffer  - Raw file data (e.g. from multer memoryStorage)
 * @param {string} filename    - Original filename (for reference only)
 * @returns {Promise<string>}  - Resolves to the secure HTTPS URL of the uploaded image
 */
async function uploadImage(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'fixgh-reports', resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

module.exports = { uploadImage };
