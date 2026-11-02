const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['citizen', 'officer', 'admin'],
    default: 'citizen',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved'],
    default: 'approved',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  suspensionReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  suspendedAt: {
    type: Date,
    default: null,
  },
  spamStrikeCount: {
    type: Number,
    min: 0,
    default: 0,
  },
  trustScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 10,
  },
  spamRestrictedAt: {
    type: Date,
    default: null,
  },
  lastAppeal: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: '',
  },
  lastAppealAt: {
    type: Date,
    default: null,
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[+]?[\d\s-]{10,15}$/, 'Please enter a valid phone number'],
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
    select: false,
  },
  emailVerificationExpires: {
    type: Date,
    select: false,
  },
  emailVerificationOtp: {
    type: String,
    select: false,
  },
  emailVerificationOtpExpires: {
    type: Date,
    select: false,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  passwordChangedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationOtp;
      delete ret.passwordResetToken;
      return ret;
    },
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (typeof this.password === 'string' && this.password.startsWith('$2a$')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
