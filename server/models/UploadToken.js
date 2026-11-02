const mongoose = require('mongoose');

const uploadTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  issuedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: { type: Date, default: null },
});

module.exports = mongoose.model('UploadToken', uploadTokenSchema);
