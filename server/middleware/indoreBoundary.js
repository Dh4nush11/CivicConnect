const fs = require('fs/promises');
const spamConfig = require('../config/spam');
const { getBoundary, isInsideIndore } = require('../utils/indoreBoundary');

const cleanupUploads = async (req) => Promise.all((req.files || []).map((file) => fs.unlink(file.path)
  .catch((error) => { if (error.code !== 'ENOENT') throw error; })));

const validateIndoreLocation = (getCoordinates) => async (req, res, next) => {
  try {
    const coordinates = getCoordinates(req);
    if (!coordinates) return next();
    const lat = Number(coordinates.lat);
    const lng = Number(coordinates.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      await cleanupUploads(req);
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }
    if (!spamConfig.indoreBoundaryEnforcement) return next();
    const boundary = getBoundary();
    if (!isInsideIndore(lat, lng, boundary)) {
      await cleanupUploads(req);
      return res.status(400).json({
        success: false,
        message: 'This report location is outside the configured Indore service area.',
        code: 'OUTSIDE_INDORE_BOUNDARY',
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  validateCreateLocation: validateIndoreLocation((req) => ({ lat: req.body.lat, lng: req.body.lng })),
  validateEditLocation: validateIndoreLocation((req) =>
    req.body.lat !== undefined || req.body.lng !== undefined
      ? { lat: req.body.lat, lng: req.body.lng }
      : null
  ),
  validateQueryLocation: validateIndoreLocation((req) => {
    const hasLat = req.query.lat !== undefined;
    const hasLng = req.query.lng !== undefined;
    if (!hasLat && !hasLng) return null;
    if (!hasLat || !hasLng) return { lat: NaN, lng: NaN };
    return { lat: req.query.lat, lng: req.query.lng };
  }),
};
