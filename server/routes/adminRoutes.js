const express = require('express');
const { body } = require('express-validator');
const {
  updateIssueStatus,
  assignIssue,
  getAnalytics,
  getAuthorityUsers,
  flagDuplicate,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const consumeUploadToken = require('../middleware/consumeUploadToken');
const { requireAuthorityOrAdmin, requireRole } = require('../middleware/role');
const upload = require('../middleware/upload');
const {
  listUsers,
  deleteUserAccount,
  createUser,
  approveUser,
  changeRole,
  setSuspension,
  reviewSpam,
  spamQueue,
  getAuditLog,
  getStats,
  exportSpamDecisions,
} = require('../controllers/moderationController');

const router = express.Router();

router.use(protect, requireAuthorityOrAdmin);

router.put(
  '/issues/:id/status',
  upload.single('resolutionPhoto'),
  consumeUploadToken,
  [
    body('status')
      .isIn(['in_progress', 'resolved'])
      .withMessage('Invalid status'),
  ],
  updateIssueStatus
);

router.put('/issues/:id/assign', assignIssue);
router.put('/issues/:id/duplicate', flagDuplicate);
router.get('/analytics', getAnalytics);
router.get('/users/authority', getAuthorityUsers);
router.get('/issues/spam-queue', spamQueue);
router.put('/issues/:id/spam', [
  body('decision').isIn(['flag_spam', 'not_spam', 'confirmed_spam']),
  body('reason').trim().notEmpty().withMessage('A reason is required'),
], reviewSpam);
router.get('/stats', getStats);
router.get('/audit-log', requireRole('admin'), getAuditLog);
router.get('/spam-decisions/export', requireRole('admin'), exportSpamDecisions);
router.get('/users', requireRole('admin'), listUsers);
router.post('/users', requireRole('admin'), createUser);
router.delete('/users/:id', requireRole('admin'), deleteUserAccount);
router.put('/users/:id/approve', requireRole('admin'), approveUser);
router.put('/users/:id/role', requireRole('admin'), changeRole);
router.put('/users/:id/suspension', requireRole('admin'), setSuspension);

module.exports = router;
