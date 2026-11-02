const fs = require('fs/promises');
const path = require('path');
const exifr = require('exifr');
const sharp = require('sharp');
const perceptualHash = require('sharp-phash');
const spamConfig = require('../config/spam');
const { isCloudinaryConfigured, uploadPublishedImage } = require('./mediaStorage');

const makePerceptualHash = async (filePath) => perceptualHash(await fs.readFile(filePath));

const parseExif = async (filePath) => {
  const metadata = await exifr.parse(filePath, {
    gps: true,
    pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude'],
  });
  const gps = await exifr.gps(filePath);
  const lat = Number(gps?.latitude);
  const lng = Number(gps?.longitude);
  const capturedAt = metadata?.DateTimeOriginal || metadata?.CreateDate || null;
  return {
    location: Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng, ...(capturedAt ? { capturedAt: new Date(capturedAt) } : {}) }
      : null,
    capturedAt: capturedAt ? new Date(capturedAt) : null,
  };
};

const moderateImage = async (filePath) => {
  const providers = spamConfig.classifierProviders.filter((provider) => provider !== 'off');
  if (!providers.length) return null;
  const results = [];
  for (const providerName of providers) {
    let result;
    if (providerName === 'clip') {
      result = await require('./imageModeration').classifyWithClip(filePath);
    } else if (providerName === 'nsfwjs') {
      result = await require('./imageModeration').classifyWithNsfw(filePath);
    } else {
      throw new Error(`Unsupported IMAGE_MODERATION_PROVIDER: ${providerName}`);
    }
    results.push({ provider: providerName, ...result });
  }
  return {
    flagged: results.some((result) => result.flagged),
    score: Math.max(0, ...results.map((result) => Number(result.score) || 0)),
    providers: results,
  };
};

const analyzeImages = async (files) => {
  const results = [];
  for (const file of files) {
    let exif;
    try {
      exif = await parseExif(file.path);
    } catch (error) {
      if (error.code === 'ENOENT') throw error;
      exif = { location: null, capturedAt: null };
    }
    const hash = await makePerceptualHash(file.path);
    const moderation = await moderateImage(file.path);
    results.push({ exif, hash, moderation });
  }
  return results;
};

const removeFiles = async (files) => {
  await Promise.all(files.map((file) => fs.unlink(file.path).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  })));
};

const publishCleanImage = async (sourcePath, originalFilename) => {
  if (process.env.NODE_ENV === 'production' && !isCloudinaryConfigured()) {
    throw new Error('Cloudinary must be configured for persistent image storage in production.');
  }
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const outputName = `${path.parse(originalFilename).name}.jpg`;
  const outputPath = path.join(uploadsDir, outputName);
  await sharp(sourcePath).rotate().jpeg({ quality: 90 }).toFile(outputPath);
  try {
    const cloudUrl = await uploadPublishedImage(outputPath, outputName);
    if (cloudUrl) return cloudUrl;
  } finally {
    if (isCloudinaryConfigured()) {
      await fs.unlink(outputPath).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }
  return outputName;
};

module.exports = {
  analyzeImages,
  removeFiles,
  perceptualHash: makePerceptualHash,
  parseExif,
  moderateImage,
  publishCleanImage,
};
