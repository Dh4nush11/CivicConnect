const Notification = require('../models/Notification');

const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      readAt: null,
    });
    res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Notification.countDocuments({ recipient: req.user._id, readAt: null }),
    ]);
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) {
      const exists = await Notification.exists({ _id: req.params.id, recipient: req.user._id });
      if (!exists) return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    res.json({ success: true, data: { notification } });
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUnreadCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
