const fs = require('fs/promises');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const uploadsDirectory = path.join(__dirname, '..', 'uploads');

const isCloudinaryConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET);

const getCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary storage is not configured.');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
};

const getCloudinaryPublicId = (reference) => {
  let url;
  try {
    url = new URL(reference);
  } catch {
    return null;
  }
  if (url.hostname !== 'res.cloudinary.com') return null;

  const segments = url.pathname.split('/').filter(Boolean);
  const uploadIndex = segments.indexOf('upload');
  if (uploadIndex < 0 || segments[uploadIndex - 1] !== 'image') return null;

  const assetSegments = segments.slice(uploadIndex + 1);
  if (/^v\d+$/.test(assetSegments[0] || '')) assetSegments.shift();
  if (!assetSegments.length) return null;

  const last = assetSegments.length - 1;
  assetSegments[last] = assetSegments[last].replace(/\.[^.]+$/, '');
  return assetSegments.join('/');
};

const uploadPublishedImage = async (filePath, filename) => {
  if (!isCloudinaryConfigured()) return null;
  const result = await getCloudinary().uploader.upload(filePath, {
    folder: process.env.CLOUDINARY_FOLDER || 'civic-connect',
    public_id: path.parse(filename).name,
    resource_type: 'image',
    overwrite: false,
    unique_filename: false,
  });
  if (!result.secure_url) {
    throw new Error('Cloudinary upload completed without returning a secure image URL.');
  }
  return result.secure_url;
};

const deletePublishedImage = async (reference) => {
  if (!reference) return;
  const publicId = getCloudinaryPublicId(reference);
  if (publicId) {
    const result = await getCloudinary().uploader.destroy(publicId, { resource_type: 'image' });
    if (!['ok', 'not found'].includes(result.result)) {
      throw new Error(`Cloudinary could not delete image ${publicId}: ${result.result}`);
    }
    return;
  }
  if (/^https?:\/\//i.test(String(reference))) {
    throw new Error('Cannot delete a remote image that is not a CivicConnect Cloudinary asset.');
  }

  const filename = path.basename(String(reference).replace(/^\/uploads\//, ''));
  try {
    await fs.unlink(path.join(uploadsDirectory, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const deletePublishedImages = async (references) =>
  Promise.all(references.filter(Boolean).map(deletePublishedImage));

module.exports = {
  isCloudinaryConfigured,
  getCloudinaryPublicId,
  uploadPublishedImage,
  deletePublishedImage,
  deletePublishedImages,
};
