const express = require('express');
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  getMe,
  verifyEmail,
  verifyEmailOtp,
  resendVerification,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect, protectAppeal } = require('../middleware/auth');
const { submitAppeal } = require('../controllers/moderationController');

const router = express.Router();

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts, please try again later.',
    code: 'RATE_LIMITED',
  },
});

const looseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMITED',
  },
});

router.post(
  '/register',
  strictLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
    body('email').trim().isEmail().withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('phone')
      .optional()
      .matches(/^[+]?[\d\s-]{10,15}$/)
      .withMessage('Please enter a valid phone number'),
  ],
  register
);

router.post(
  '/login',
  strictLimiter,
  [
    body('email').trim().isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.post(
  '/verify-email/otp',
  strictLimiter,
  [
    body('email').trim().isEmail().withMessage('Please enter a valid email'),
    body('otp').matches(/^\d{6}$/).withMessage('Enter the 6-digit verification code'),
  ],
  verifyEmailOtp
);

router.post(
  '/verify-email/:token',
  [param('token').notEmpty().withMessage('Token is required')],
  verifyEmail
);

router.get(
  '/verify-email/:token',
  [param('token').notEmpty().withMessage('Token is required')],
  verifyEmail
);

router.post(
  '/resend-verification',
  strictLimiter,
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email'),
  ],
  resendVerification
);

router.post(
  '/forgot-password',
  strictLimiter,
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email'),
  ],
  forgotPassword
);

router.post(
  '/reset-password/:token',
  looseLimiter,
  [
    param('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) throw new Error('Passwords do not match');
        return true;
      }),
  ],
  resetPassword
);

router.get('/me', protect, getMe);
router.post('/appeal', protectAppeal, body('message').trim().notEmpty(), submitAppeal);

module.exports = router;
