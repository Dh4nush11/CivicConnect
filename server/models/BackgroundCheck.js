const mongoose = require('mongoose');

const backgroundCheckSchema = new mongoose.Schema({
  issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, unique: true },
  filePaths: { type: [String], default: [] },
  fileNames: { type: [String], default: [] },
  status: { type: String, enum: ['pending', 'processing'], default: 'pending', index: true },
  lockedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('BackgroundCheck', backgroundCheckSchema);
