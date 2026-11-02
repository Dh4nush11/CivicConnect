const { createHash } = require('crypto');
const fs = require('fs/promises');
const UploadToken = require('../models/UploadToken');

const consumeUploadToken = async (req, res, next) => {
  try {
    const uploads = [...(req.files || []), ...(req.file ? [req.file] : [])];
    if (!uploads.length && req.method === 'PUT') return next();
    const discardUploads = async () => Promise.all(uploads.map((file) => fs.unlink(file.path)
      .catch((error) => { if (error.code !== 'ENOENT') throw error; })));
    const token = req.get('x-upload-token');
    if (!token) {
      await discardUploads();
      return res.status(401).json({ success: false, message: 'A valid upload token is required.', code: 'UPLOAD_TOKEN_REQUIRED' });
    }
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();
    const record = await UploadToken.findOneAndUpdate(
      { tokenHash, user: req.user._id, usedAt: null, expiresAt: { $gt: now } },
      { $set: { usedAt: now } },
      { new: true }
    );
    if (!record) {
      await discardUploads();
      return res.status(401).json({ success: false, message: 'Upload token is invalid, expired, or already used. Reopen the report form and try again.', code: 'UPLOAD_TOKEN_INVALID' });
    }
    req.uploadToken = record;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = consumeUploadToken;
