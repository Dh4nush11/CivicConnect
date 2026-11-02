const { randomBytes } = require('crypto');
const AuditLog = require('../models/AuditLog');
const Comment = require('../models/Comment');
const Issue = require('../models/Issue');
const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');
const { officerWelcome } = require('../utils/emailTemplates');
const { applyConfirmedSpamStrike, reverseConfirmedSpamStrike } = require('../utils/spamModeration');
const { canReviewSpam, canFlagSpam } = require('../utils/issuePolicy');
const { notifyRoles, createNotifications } = require('../utils/notifications');
const Notification = require('../models/Notification');
const spamConfig = require('../config/spam');
const { reasonSummary } = require('../utils/spamScoring');
const { primaryAdminEmail } = require('../config/roles');
const { normalizeEmail, findUserByEmail } = require('../utils/userEmails');
const { deletePublishedImage } = require('../utils/mediaStorage');

const listUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status === 'pending') filter.approvalStatus = 'pending';
    if (['citizen', 'officer', 'admin'].includes(req.query.role)) filter.role = req.query.role;
    const users = await User.find(filter)
      .select('-password -emailVerificationToken -emailVerificationOtp -passwordResetToken')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
};

const deleteUserAccount = async (req, res, next) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'A reason is required to delete a user account.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.email.toLowerCase() === primaryAdminEmail) {
      return res.status(403).json({
        success: false,
        message: 'The primary administrator account is protected from deletion.',
      });
    }
    if (String(user._id) === String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete the account you are currently using.',
      });
    }

    const reports = await Issue.find({ reportedBy: user._id }).select('_id images resolutionPhoto').lean();
    const reportIds = reports.map((report) => report._id);
    const mediaReferences = [...new Set(reports.flatMap((report) => [
      ...(report.images || []),
      report.resolutionPhoto,
    ]).filter((filename) => typeof filename === 'string' && filename.trim())
    )];

    if (reportIds.length) {
      await Issue.deleteMany({ _id: { $in: reportIds } });
      await Comment.deleteMany({ issueId: { $in: reportIds } });
      await Notification.deleteMany({ issue: { $in: reportIds } });
    }
    await Comment.deleteMany({ userId: user._id });
    await Notification.deleteMany({ recipient: user._id });
    await Issue.updateMany({ upvotes: user._id }, { $pull: { upvotes: user._id } });
    await Issue.updateMany({ assignedTo: user._id }, { $set: { assignedTo: null } });
    if (reportIds.length) {
      await Issue.updateMany(
        { duplicateOf: { $in: reportIds } },
        { $set: { duplicateOf: null, isDuplicateFlag: false } }
      );
    }

    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action: 'user.deleted',
      targetType: 'user',
      targetId: user._id,
      reason,
      metadata: { email: user.email, role: user.role, deletedReports: reportIds.length },
    });

    const fileErrors = [];
    for (const reference of mediaReferences) {
      try {
        await deletePublishedImage(reference);
      } catch (error) {
        fileErrors.push(reference);
      }
    }

    await User.findByIdAndDelete(user._id);
    if (fileErrors.length) {
      return res.status(500).json({
        success: false,
        message: `User account and ${reportIds.length} report(s) were deleted, but some uploaded files could not be removed.`,
        code: 'USER_DELETED_FILE_CLEANUP_FAILED',
        data: { failedFiles: fileErrors },
      });
    }
    return res.json({
      success: true,
      message: `${user.role} account deleted along with ${reportIds.length} report(s) and their uploaded files.`,
      data: { deletedUserId: String(user._id), deletedReports: reportIds.length },
    });
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'citizen' } = req.body;
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim()) ||
        !['citizen', 'officer'].includes(role) ||
        (role === 'citizen' && (!password || password.length < 6)) ||
        (role === 'officer' && password)) {
      return res.status(400).json({
        success: false,
        message: 'Provide a name and valid email. Citizen accounts need a password of at least 6 characters; officer passwords are generated and emailed.',
      });
    }
    const normalizedEmail = normalizeEmail(email);
    if (await findUserByEmail(User, normalizedEmail)) {
      return res.status(409).json({ success: false, message: 'An account already exists for this email.' });
    }
    const temporaryPassword = role === 'officer'
      ? randomBytes(18).toString('base64url')
      : password;
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: temporaryPassword,
      role,
      isEmailVerified: true,
      approvalStatus: 'approved',
      ...(role === 'officer' ? { approvedBy: req.user._id, approvedAt: new Date() } : {}),
    });
    if (role === 'officer') {
      try {
        await sendEmail({
          to: normalizedEmail,
          subject: 'Your CivicConnect municipal officer sign-in details',
          html: officerWelcome({
            name: user.name,
            email: normalizedEmail,
            temporaryPassword,
          }),
          text: `Hello ${user.name}, an administrator created your municipal officer account. Sign-in email: ${normalizedEmail}. Temporary password: ${temporaryPassword}. Sign in at ${process.env.CLIENT_URL || 'http://localhost:5173'}/login and change the temporary password as soon as possible.`,
        });
      } catch (emailError) {
        try {
          await User.findByIdAndDelete(user._id);
        } catch (cleanupError) {
          return next(cleanupError);
        }
        return res.status(503).json({
          success: false,
          message: 'Officer account was not created because the sign-in email could not be sent. Check SMTP configuration and try again.',
          code: 'OFFICER_EMAIL_DELIVERY_FAILED',
        });
      }
    }
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action: 'user.created',
      targetType: 'user',
      targetId: user._id,
      reason: role === 'officer' ? 'Officer account created and sign-in details emailed' : '',
      metadata: { role, ...(role === 'officer' ? { emailSent: true } : {}) },
    });
    res.status(201).json({
      success: true,
      message: role === 'officer'
        ? 'Officer account created and sign-in details emailed.'
        : 'Citizen account created.',
      data: { user: user.toJSON(), ...(role === 'officer' ? { emailSent: true } : {}) },
    });
  } catch (error) {
    next(error);
  }
};

const approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role !== 'officer') {
      return res.status(400).json({ success: false, message: 'Only officer accounts require administrator approval.' });
    }
    user.approvalStatus = 'approved';
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
    await user.save();
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action: 'user.approved',
      targetType: 'user',
      targetId: user._id,
      reason: req.body.reason || '',
    });
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

const changeRole = async (req, res, next) => {
  try {
    const { role, reason = '' } = req.body;
    if (!['citizen', 'officer', 'admin'].includes(role) || !String(reason).trim()) {
      return res.status(400).json({ success: false, message: 'Role must be citizen, officer, or admin, and a reason is required.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.email.toLowerCase() === primaryAdminEmail && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'The primary administrator role cannot be removed.' });
    }
    const previousRole = user.role;
    user.role = role;
    user.approvalStatus = role === 'officer' ? 'pending' : 'approved';
    user.approvedBy = role === 'officer' ? null : req.user._id;
    user.approvedAt = role === 'officer' ? null : new Date();
    await user.save();
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action: 'user.role_changed',
      targetType: 'user',
      targetId: user._id,
      reason,
      metadata: { from: previousRole, to: role },
    });
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

const setSuspension = async (req, res, next) => {
  try {
    const { suspended, reason } = req.body;
    if (typeof suspended !== 'boolean' || !String(reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'Provide suspended as a boolean and a reason for the moderation action.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.email.toLowerCase() === primaryAdminEmail && suspended) {
      return res.status(403).json({ success: false, message: 'The primary administrator cannot be suspended through this endpoint.' });
    }
    user.isActive = !suspended;
    user.suspensionReason = suspended ? String(reason).trim() : '';
    user.suspendedAt = suspended ? new Date() : null;
    await user.save();
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action: suspended ? 'user.suspended' : 'user.unsuspended',
      targetType: 'user',
      targetId: user._id,
      reason: String(reason).trim(),
    });
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

const submitAppeal = async (req, res, next) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message || message.length > 2000) {
      return res.status(400).json({ success: false, message: 'Appeal message is required and must be under 2000 characters.' });
    }
    if (req.user.isActive !== false) {
      return res.status(400).json({ success: false, message: 'Only suspended users can submit an appeal.' });
    }
    req.user.lastAppeal = message;
    req.user.lastAppealAt = new Date();
    await req.user.save();
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action: 'user.appeal_submitted',
      targetType: 'user',
      targetId: req.user._id,
      reason: message,
    });
    res.status(201).json({ success: true, message: 'Your appeal has been sent to the administrators.' });
  } catch (error) {
    next(error);
  }
};

const reviewSpam = async (req, res, next) => {
  try {
    const { decision, reason = '' } = req.body;
    if (!['flag_spam', 'not_spam', 'confirmed_spam'].includes(decision) || !String(reason).trim()) {
      return res.status(400).json({ success: false, message: 'A valid spam action and reason are required.' });
    }
    if (!canReviewSpam(req.user.role, decision)) {
      return res.status(403).json({
        success: false,
        message: decision === 'flag_spam'
          ? 'Only municipal officers can flag a report for spam review.'
          : 'Only an administrator can decide whether a flagged report is spam.',
      });
    }
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Report not found.' });
    if (decision === 'flag_spam') {
      if (!canFlagSpam(issue)) {
        return res.status(409).json({ success: false, message: 'This report has already been confirmed as spam by an administrator.' });
      }
      issue.spamStatus = 'suspected';
      if (issue.decision?.at) {
        issue.decision = { by: null, at: null, reason: '' };
      }
      issue.spamReasons = [
        ...(issue.spamReasons || []).filter((item) =>
          (typeof item === 'string' ? item : item?.code) !== 'staff_flagged_spam'),
        { code: 'staff_flagged_spam', text: String(reason).trim() },
      ];
      await issue.save();
      await notifyRoles({
        roles: ['admin'],
        actorId: req.user._id,
        issueId: issue._id,
        type: 'spam_flagged',
        title: 'Report flagged for spam review',
        message: `A municipal officer flagged "${issue.title}" for administrator review.`,
      });
      await AuditLog.create({
        actor: req.user._id,
        actorEmail: req.user.email,
        action: 'spam.flagged',
        targetType: 'issue',
        targetId: issue._id,
        reason: String(reason).trim(),
      });
      return res.json({ success: true, data: { issue } });
    }
    const owner = await User.findById(issue.reportedBy);
    if (decision === 'not_spam') {
      const wasConfirmed = issue.spamStatus === 'confirmed' && Boolean(issue.confirmedSpamAt);
      if (wasConfirmed && owner) {
        reverseConfirmedSpamStrike(owner);
        await owner.save();
      } else if (owner && issue.spamStatus !== 'cleared') {
        owner.trustScore = Math.min(100, (owner.trustScore || 0) + spamConfig.trustScorePerClearance);
        await owner.save();
      }
      issue.spamStatus = 'cleared';
      issue.spamScore = 0;
      issue.spamReasons = [];
      issue.decision = { by: req.user._id, at: new Date(), reason: String(reason).trim() };
      if (wasConfirmed) {
        issue.confirmedSpamAt = null;
        issue.confirmedSpamBy = null;
      }
    } else {
      if (issue.spamStatus !== 'confirmed') {
        issue.spamStatus = 'confirmed';
        issue.decision = { by: req.user._id, at: new Date(), reason: String(reason).trim() };
        if (!issue.confirmedSpamAt) {
          issue.confirmedSpamAt = new Date();
          issue.confirmedSpamBy = req.user._id;
          if (owner) {
            const strike = applyConfirmedSpamStrike(owner);
            owner.trustScore = Math.max(0, (owner.trustScore || 0) - spamConfig.trustScorePerConfirmedSpam);
            await owner.save();
            if (strike.newlyRestricted) {
              await AuditLog.create({
                actor: req.user._id,
                actorEmail: req.user.email,
                action: 'user.spam_restricted',
                targetType: 'user',
                targetId: owner._id,
                reason: `Account reached ${owner.spamStrikeCount} confirmed spam strikes.`,
              });
              const admins = await User.find({ role: 'admin', isActive: true })
                .select('email')
                .lean();
              for (const admin of admins) {
                try {
                  await sendEmail({
                    to: admin.email,
                    subject: 'CivicConnect account restricted after spam decisions',
                    text: `The account ${owner.email} reached ${owner.spamStrikeCount} confirmed-spam strikes and is now report-restricted. Review the moderation audit log and account.`,
                  });
                } catch (notificationError) {
                  console.error(`Admin restriction notification failed for ${admin.email}: ${notificationError.message}`);
                  await AuditLog.create({
                    actor: req.user._id,
                    actorEmail: req.user.email,
                    action: 'user.spam_restriction_notification_failed',
                    targetType: 'user',
                    targetId: owner._id,
                    reason: notificationError.message,
                    metadata: { adminEmail: admin.email },
                  });
                }
              }
            }
          }
        }
      }
    }
    await issue.save();
    await createNotifications({
      recipients: [issue.reportedBy],
      actorId: req.user._id,
      issueId: issue._id,
      type: decision === 'not_spam' ? 'spam_cleared' : 'spam_confirmed',
      title: decision === 'not_spam' ? 'Report cleared after review' : 'Report confirmed as spam',
      message: decision === 'not_spam'
        ? `Your report "${issue.title}" was reviewed and remains active.`
        : `Your report "${issue.title}" was reviewed and confirmed as spam.`,
    });
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action: decision === 'not_spam' ? 'spam.cleared' : 'spam.confirmed',
      targetType: 'issue',
      targetId: issue._id,
      reason: String(reason).trim(),
      metadata: { spamScore: issue.spamScore, spamReasons: issue.spamReasons },
    });
    res.json({ success: true, data: { issue } });
  } catch (error) {
    next(error);
  }
};

const spamQueue = async (req, res, next) => {
  try {
    const issues = await Issue.find({ spamStatus: { $in: ['suspected', 'confirmed'] } })
      .sort({ spamScore: -1, createdAt: -1 })
      .populate('reportedBy', 'name email');
    res.json({ success: true, data: { issues } });
  } catch (error) {
    next(error);
  }
};

const getAuditLog = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 100, 500))
      .populate('actor', 'name email');
    res.json({ success: true, data: { logs } });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const [total, suspected, confirmed, byStatus] = await Promise.all([
      Issue.countDocuments(),
      Issue.countDocuments({ spamStatus: 'suspected' }),
      Issue.countDocuments({ spamStatus: 'confirmed' }),
      Issue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    res.json({
      success: true,
      data: {
        totalReports: total,
        spamReports: suspected + confirmed,
        spamRate: total ? (suspected + confirmed) / total : 0,
        reportsByStatus: Object.fromEntries(byStatus.map(({ _id, count }) => [_id, count])),
      },
    });
  } catch (error) {
    next(error);
  }
};

const exportSpamDecisions = async (req, res, next) => {
  try {
    const issues = await Issue.find({ 'decision.at': { $ne: null } })
      .select('title category spamStatus spamScore spamReasons signalSnapshot decision createdAt')
      .populate('decision.by', 'name email')
      .lean();
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    if (format === 'csv') {
      const rows = issues.map((issue) => ({
        reportId: issue._id,
        category: issue.category,
        spamStatus: issue.spamStatus,
        spamScore: issue.spamScore,
        spamReasons: reasonSummary(issue.spamReasons || []),
        signalSnapshot: JSON.stringify(issue.signalSnapshot || {}),
        decisionBy: issue.decision?.by?.email || '',
        decisionAt: issue.decision?.at?.toISOString() || '',
        decisionReason: issue.decision?.reason || '',
      }));
      const columns = Object.keys(rows[0] || {
        reportId: '', category: '', spamStatus: '', spamScore: '', spamReasons: '',
        signalSnapshot: '', decisionBy: '', decisionAt: '', decisionReason: '',
      });
      const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const csv = [columns.join(','), ...rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(','))]
        .join('\r\n');
      res.type('text/csv').attachment('spam-decisions.csv').send(csv);
      return;
    }
    res.json({ success: true, data: { decisions: issues } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  deleteUserAccount,
  createUser,
  approveUser,
  changeRole,
  setSuspension,
  submitAppeal,
  reviewSpam,
  spamQueue,
  getAuditLog,
  getStats,
  exportSpamDecisions,
};
