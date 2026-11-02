const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  category: {
    type: String,
    enum: ['pothole', 'garbage', 'streetlight', 'water', 'sewage', 'other'],
    required: [true, 'Category is required'],
  },
  categoryDetails: {
    type: String,
    trim: true,
    maxlength: [80, 'Category details cannot exceed 80 characters'],
    default: '',
  },
  images: {
    type: [String],
    default: [],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
  },
  status: {
    type: String,
    enum: ['submitted', 'in_progress', 'resolved', 'reported', 'in-progress', 'rejected'],
    default: 'submitted',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  upvotes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  resolutionNote: {
    type: String,
    default: '',
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  resolutionPhoto: {
    type: String,
    default: '',
  },
  resolutionReview: {
    status: { type: String, enum: ['pending', 'checked', 'flagged', 'check_failed'], default: undefined },
    captureLocation: { lat: Number, lng: Number, accuracy: Number },
    exifLocation: { lat: Number, lng: Number },
    distanceFromPinMeters: Number,
    deviceDistanceFromPinMeters: Number,
    sceneSimilarityDistance: Number,
    reasons: { type: [String], default: [] },
    signalSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  reopenCount: {
    type: Number,
    min: 0,
    default: 0,
  },
  captureLocation: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    capturedAt: Date,
  },
  checkStatus: {
    type: String,
    enum: ['pending_check', 'checked', 'check_failed'],
    default: 'pending_check',
    index: true,
  },
  exifLocation: {
    lat: Number,
    lng: Number,
  },
  exifTakenAt: { type: Date, default: null },
  locationDistances: {
    deviceToPinMeters: Number,
    exifToPinMeters: Number,
  },
  imageHashes: {
    type: [String],
    default: [],
  },
  imageHash: { type: String, default: '' },
  signalSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  decision: {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: null },
    reason: { type: String, trim: true, default: '' },
  },
  spamStatus: {
    type: String,
    enum: ['none', 'suspected', 'confirmed', 'cleared'],
    default: 'none',
  },
  spamScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  spamReasons: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  confirmedSpamAt: {
    type: Date,
    default: null,
  },
  confirmedSpamBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  isDuplicateFlag: {
    type: Boolean,
    default: false,
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    default: null,
  },
}, {
  timestamps: true,
});

issueSchema.index({ location: '2dsphere' });
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ reportedBy: 1 });
issueSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('Issue', issueSchema);
