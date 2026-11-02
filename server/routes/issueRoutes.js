const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const spamConfig = require('../config/spam');
const {
  createIssue,
  getIssues,
  getIssueById,
  upvoteIssue,
  addComment,
  getMyIssues,
  getNearbyDuplicates,
  updateIssue,
  deleteIssue,
  reopenIssue,
  createUploadToken,
} = require('../controllers/issueController');
const { protect, optionalProtect } = require('../middleware/auth');
const { requireCitizen } = require('../middleware/role');
const consumeUploadToken = require('../middleware/consumeUploadToken');
const upload = require('../middleware/upload');
const {
  validateCreateLocation,
  validateEditLocation,
  validateQueryLocation,
} = require('../middleware/indoreBoundary');

const router = express.Router();
const reportCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: spamConfig.reportsPerHour,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id),
  message: {
    success: false,
    message: 'You have reached the report limit for this hour. Please try again later.',
    code: 'REPORT_RATE_LIMIT',
  },
});

router.get('/', optionalProtect, getIssues);
router.get('/duplicates', validateQueryLocation, optionalProtect, getNearbyDuplicates);
router.get('/mine', protect, getMyIssues);
router.post('/upload-token', protect, createUploadToken);

router.post(
  '/',
  protect,
  requireCitizen,
  reportCreationLimiter,
  consumeUploadToken,
  upload.array('images', 5),
  validateCreateLocation,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category')
      .isIn(['pothole', 'garbage', 'streetlight', 'water', 'sewage', 'other'])
      .withMessage('Invalid category'),
    body('categoryDetails')
      .custom((value, { req }) => req.body.category !== 'other' ||
        (typeof value === 'string' && value.trim().length > 0))
      .withMessage('Please specify the issue category when selecting Other')
      .bail()
      .custom((value) => value === undefined ||
        (typeof value === 'string' && value.length <= 80))
      .withMessage('Category details cannot exceed 80 characters'),
    body('address').notEmpty().withMessage('Address is required'),
  ],
  createIssue
);

router.get('/:id', optionalProtect, getIssueById);

router.post('/:id/reopen', protect, requireCitizen, reopenIssue);

router.put(
  '/:id',
  protect,
  upload.array('images', 5),
  consumeUploadToken,
  validateEditLocation,
  [
    body('title').optional().notEmpty().withMessage('Title is required'),
    body('description').optional().notEmpty().withMessage('Description is required'),
    body('category')
      .optional()
      .isIn(['pothole', 'garbage', 'streetlight', 'water', 'sewage', 'other'])
      .withMessage('Invalid category'),
    body('categoryDetails')
      .optional()
      .isString()
      .withMessage('Category details must be text')
      .bail()
      .isLength({ max: 80 })
      .withMessage('Category details cannot exceed 80 characters'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  ],
  updateIssue
);

router.delete('/:id', protect, deleteIssue);

router.put('/:id/upvote', protect, upvoteIssue);

router.post(
  '/:id/comments',
  protect,
  [body('text').notEmpty().withMessage('Comment text is required')],
  addComment
);

module.exports = router;
