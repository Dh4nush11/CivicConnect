const jwt = require('jsonwebtoken');
const { randomInt, createHmac } = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { primaryAdminEmail } = require('../config/roles');
const { sendEmail } = require('../utils/sendEmail');
const {
  verifyEmail: verifyEmailTemplate,
  verifyEmailOtp: verifyEmailOtpTemplate,
  resetPassword: resetPasswordTemplate,
  passwordChanged: passwordChangedTemplate,
} = require('../utils/emailTemplates');
const { generateHexToken, hashToken } = require('../utils/tokens');
const { normalizeEmail, findUserByEmail } = require('../utils/userEmails');
const { getJwtExpiry } = require('../utils/jwtExpiry');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: getJwtExpiry(),
  });
};

const hashVerificationOtp = (otp) =>
  createHmac('sha256', process.env.JWT_SECRET).update(String(otp)).digest('hex');

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});

const issueVerificationOtp = async (user) => {
  const otp = String(randomInt(0, 1000000)).padStart(6, '0');
  user.emailVerificationOtp = hashVerificationOtp(otp);
  user.emailVerificationOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });
  await sendEmail({
    to: user.email,
    subject: 'Your CivicConnect verification code',
    html: verifyEmailOtpTemplate({ name: user.name, otp, expiresMinutes: 10 }),
    text: `Your CivicConnect verification code is ${otp}. It expires in 10 minutes.`,
  });
};

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join(', '),
      });
    }

    const { name, email, password, phone } = req.body;
    const cleanEmail = normalizeEmail(email);

    if (cleanEmail === primaryAdminEmail) {
      return res.status(403).json({
        success: false,
        message: 'The primary administrator account is provisioned by an administrator.',
        code: 'ADMIN_ACCOUNT_PROVISIONED',
      });
    }

    const existingUser = await findUserByEmail(User, cleanEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        code: 'EMAIL_EXISTS',
      });
    }

    const verificationRequired = process.env.EMAIL_VERIFICATION_REQUIRED === 'true';
    const hasSmtp = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    );
    if (verificationRequired && !hasSmtp && process.env.SMTP_USE_ETHEREAL !== 'true') {
      return res.status(503).json({
        success: false,
        message: 'Email verification is enabled, but SMTP is not configured. Configure SMTP before registering.',
        code: 'EMAIL_NOT_CONFIGURED',
      });
    }

    const userData = {
      name,
      email: cleanEmail,
      password,
      role: 'citizen',
      phone: phone || '',
      isEmailVerified: !verificationRequired,
    };

    if (verificationRequired) {
      userData.isEmailVerified = false;
    }

    const user = await User.create(userData);
    if (verificationRequired) {
      try {
        await issueVerificationOtp(user);
      } catch (mailErr) {
        console.error('[register] Email send failed:', mailErr.message);
        return res.status(502).json({
          success: false,
          message: 'Your account was created, but the verification email could not be sent. Please request a new code.',
          code: 'EMAIL_DELIVERY_FAILED',
          data: { email: user.email },
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Registration successful. Enter the 6-digit code sent to your email. The code expires in 10 minutes.',
        data: { emailSent: true, email: user.email },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { token: generateToken(user._id), user: serializeUser(user) },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join(', '),
      });
    }

    const { email, password } = req.body;
    const cleanEmail = normalizeEmail(email);

    const user = await findUserByEmail(User, cleanEmail).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      const appealToken = jwt.sign(
        { id: user._id, purpose: 'suspension-appeal' },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );
      return res.status(403).json({
        success: false,
        message: `This account is suspended${user.suspensionReason ? `: ${user.suspensionReason}` : ''}`,
        code: 'ACCOUNT_SUSPENDED',
        data: { appealToken },
      });
    }
    if (user.approvalStatus === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is awaiting administrator approval.',
        code: 'ACCOUNT_PENDING_APPROVAL',
      });
    }
    if (user.email.toLowerCase() === primaryAdminEmail && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED',
        data: { email: user.email },
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: serializeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
        code: 'INVALID_TOKEN',
      });
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid or has expired',
        code: 'TOKEN_INVALID_OR_EXPIRED',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationOtp = undefined;
    user.emailVerificationOtpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.',
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmailOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((error) => error.msg).join(', '),
      });
    }

    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp);
    const user = await User.findOne({
      email,
      emailVerificationOtp: hashVerificationOtp(otp),
      emailVerificationOtpExpires: { $gt: new Date() },
    }).select('+emailVerificationOtp +emailVerificationOtpExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'The verification code is invalid or has expired. Request a new code and try again.',
        code: 'OTP_INVALID_OR_EXPIRED',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationOtp = undefined;
    user.emailVerificationOtpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    return next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join(', '),
      });
    }

    const { email } = req.body;
    const cleanEmail = normalizeEmail(email);
    const GENERIC_MSG =
      'If an unverified CivicConnect account exists for that email, a new verification code has been sent.';

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(200).json({ success: true, message: GENERIC_MSG });
    }
    if (user.isEmailVerified) {
      return res.status(200).json({ success: true, message: GENERIC_MSG });
    }

    try {
      await issueVerificationOtp(user);
    } catch (mailErr) {
      console.error('[resendVerification] Email send failed:', mailErr.message);
      return res.status(502).json({
        success: false,
        message: 'The verification email could not be sent. Please try again later.',
        code: 'EMAIL_DELIVERY_FAILED',
      });
    }

    res.status(200).json({ success: true, message: GENERIC_MSG });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join(', '),
      });
    }

    const { email } = req.body;
    const cleanEmail = normalizeEmail(email);
    const GENERIC_MSG =
      'If a CivicConnect account exists with that email, a password reset link has been sent.';

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(200).json({ success: true, message: GENERIC_MSG });
    }

    const EXPIRES_MIN = 20;
    const rawToken = generateHexToken(32);
    user.passwordResetToken = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + EXPIRES_MIN * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset your CivicConnect password',
        html: resetPasswordTemplate({ name: user.name, resetLink, expiresMinutes: EXPIRES_MIN }),
      });
    } catch (mailErr) {
      console.error('[forgotPassword] Email send failed:', mailErr.message);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(502).json({
        success: false,
        message: 'We could not send the password reset email. Please try again later.',
        code: 'EMAIL_DELIVERY_FAILED',
      });
    }

    res.status(200).json({ success: true, message: GENERIC_MSG });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join(', '),
      });
    }

    const { token } = req.params;
    const { password } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required',
        code: 'INVALID_TOKEN',
      });
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired',
        code: 'TOKEN_INVALID_OR_EXPIRED',
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: 'Your CivicConnect password was changed',
        html: passwordChangedTemplate({ name: user.name }),
      });
    } catch (mailErr) {
      console.error('[resetPassword] Confirmation email send failed:', mailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Your password has been reset. Please login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: serializeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  verifyEmail,
  verifyEmailOtp,
  resendVerification,
  forgotPassword,
  resetPassword,
};
