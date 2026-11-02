const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getUnreadCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);
router.get('/unread-count', getUnreadCount);
router.get('/', getNotifications);
router.put('/read-all', markAllNotificationsRead);
router.put('/:id/read', markNotificationRead);

module.exports = router;
