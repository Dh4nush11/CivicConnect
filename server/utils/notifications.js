const User = require('../models/User');
const Notification = require('../models/Notification');

const createNotifications = async ({
  recipients,
  actorId = null,
  issueId = null,
  type,
  title,
  message,
}) => {
  const recipientIds = [...new Set(recipients
    .filter(Boolean)
    .map((id) => String(id))
    .filter((id) => !actorId || id !== String(actorId)))];
  if (!recipientIds.length) return [];

  return Notification.insertMany(recipientIds.map((recipient) => ({
    recipient,
    actor: actorId,
    issue: issueId,
    type,
    title,
    message,
  })));
};

const notifyRoles = async ({ roles, ...notification }) => {
  const users = await User.find({
    role: { $in: roles },
    isActive: true,
    approvalStatus: 'approved',
  }).select('_id').lean();
  return createNotifications({
    ...notification,
    recipients: users.map((user) => user._id),
  });
};

module.exports = { createNotifications, notifyRoles };
