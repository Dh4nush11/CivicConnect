const { validationResult } = require('express-validator');
const Issue = require('../models/Issue');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { canResolveIssue, canUpdateIssueStatus, canAssignIssueTo } = require('../utils/issuePolicy');
const { createNotifications, notifyRoles } = require('../utils/notifications');
const fs = require('fs/promises');
const { analyzeImages, publishCleanImage } = require('../utils/imageAnalysis');
const { haversineMeters, hammingDistance } = require('../utils/spamScoring');
const spamConfig = require('../config/spam');

const updateIssueStatus = async (req, res, next) => {
  let resolutionPhotoPersisted = false;
  const discardResolutionPhoto = async () => {
    if (!req.file || resolutionPhotoPersisted) return;
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  };
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await discardResolutionPhoto();
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join(', '),
      });
    }

    const { status, resolutionNote } = req.body;

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      await discardResolutionPhoto();
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    if (!canUpdateIssueStatus(req.user, issue)) {
      await discardResolutionPhoto();
      return res.status(403).json({
        success: false,
        message: 'Only the assigned officer or an administrator can update this report status.',
      });
    }

    if (status === 'resolved' && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'A resolution photo is required before resolving a report.',
        code: 'RESOLUTION_PHOTO_REQUIRED',
      });
    }
    if (req.file && status !== 'resolved') {
      await discardResolutionPhoto();
      return res.status(400).json({
        success: false,
        message: 'A resolution photo can only be attached while resolving the report.',
      });
    }
    if (!canResolveIssue(issue.status, status, Boolean(req.file))) {
      await discardResolutionPhoto();
      return res.status(400).json({
        success: false,
        message: 'Status must move from submitted to in_progress, then to resolved.',
      });
    }
    const previousStatus = issue.status;
    issue.status = status;
    if (resolutionNote !== undefined) issue.resolutionNote = resolutionNote;
    if (req.file) {
      try {
        const [analysis] = await analyzeImages([req.file]);
        const [lng, lat] = issue.location.coordinates;
        const exifLocation = analysis.exif.location;
        const exifDistance = exifLocation
          ? haversineMeters({ lat, lng }, exifLocation)
          : null;
        let captureLocation = null;
        if (req.body.captureLocation) {
          try {
            captureLocation = JSON.parse(req.body.captureLocation);
          } catch {
            const error = new Error('Resolution capture location must be valid JSON.');
            error.statusCode = 400;
            throw error;
          }
          if (!Number.isFinite(Number(captureLocation?.lat)) ||
              !Number.isFinite(Number(captureLocation?.lng))) {
            const error = new Error('Resolution capture location must contain valid coordinates.');
            error.statusCode = 400;
            throw error;
          }
          captureLocation = {
            lat: Number(captureLocation.lat),
            lng: Number(captureLocation.lng),
            accuracy: Number.isFinite(Number(captureLocation.accuracy))
              ? Math.max(0, Number(captureLocation.accuracy))
              : 0,
            capturedAt: captureLocation.capturedAt ? new Date(captureLocation.capturedAt) : null,
          };
          const captureTime = captureLocation.capturedAt?.getTime();
          const issuedAt = req.uploadToken?.issuedAt?.getTime();
          if (!Number.isFinite(captureTime) || !issuedAt ||
              captureTime < issuedAt - 30000 || captureTime > Date.now() ||
              Date.now() - captureTime > spamConfig.captureTimestampWindowMinutes * 60000) {
            const error = new Error('Resolution capture timestamp is outside the active upload session.');
            error.statusCode = 400;
            throw error;
          }
        }
        const deviceDistance = captureLocation
          ? haversineMeters({ lat, lng }, captureLocation)
          : null;
        const deviceThreshold = Math.max(
          spamConfig.locationMismatchMeters,
          (captureLocation?.accuracy || 0) * spamConfig.locationAccuracyMultiplier
        );
        const similarities = (issue.imageHashes || []).map((hash) =>
          hammingDistance(hash, analysis.hash)
        );
        const sceneSimilarityDistance = similarities.length ? Math.min(...similarities) : null;
        const reasons = [];
        if (exifDistance !== null && exifDistance > deviceThreshold) {
          reasons.push('resolution_location_mismatch');
        }
        if (deviceDistance !== null && deviceDistance > deviceThreshold) {
          reasons.push('resolution_capture_location_mismatch');
        }
        if (sceneSimilarityDistance === null || sceneSimilarityDistance > spamConfig.duplicateHashDistance) {
          reasons.push('resolution_scene_mismatch');
        }
        if (analysis.exif.capturedAt &&
            Date.now() - analysis.exif.capturedAt.getTime() > spamConfig.stalePhotoAgeHours * 3600000) {
          reasons.push('resolution_photo_stale');
        }
        if (analysis.moderation?.flagged) reasons.push('resolution_image_content_flag');
        issue.resolutionReview = {
          status: reasons.length ? 'flagged' : 'checked',
          exifLocation: exifLocation || undefined,
          captureLocation: captureLocation || undefined,
          distanceFromPinMeters: exifDistance,
          deviceDistanceFromPinMeters: deviceDistance,
          sceneSimilarityDistance,
          reasons,
          signalSnapshot: {
            exifDistanceFromPinMeters: exifDistance,
            deviceDistanceFromPinMeters: deviceDistance,
            deviceThresholdMeters: deviceThreshold,
            sceneSimilarityDistance,
            locationThresholdMeters: spamConfig.locationMismatchMeters,
            sceneThreshold: spamConfig.duplicateHashDistance,
          },
        };
        issue.resolutionPhoto = await publishCleanImage(req.file.path, req.file.filename);
      } catch (analysisError) {
        if (analysisError.statusCode === 400) throw analysisError;
        issue.resolutionReview = {
          status: 'check_failed',
          reasons: ['resolution_check_failed'],
          signalSnapshot: { error: analysisError.message },
        };
        issue.resolutionPhoto = await publishCleanImage(req.file.path, req.file.filename);
      } finally {
        await fs.unlink(req.file.path).catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        });
      }
    }
    if (status === 'resolved') issue.resolvedAt = new Date();
    if (status !== 'resolved') issue.resolvedAt = null;

    await issue.save();
    resolutionPhotoPersisted = Boolean(req.file);
    const statusLabel = status === 'in_progress' ? 'In Progress' : 'Resolved';
    await Promise.all([
      createNotifications({
        recipients: [issue.reportedBy, issue.assignedTo],
        actorId: req.user._id,
        issueId: issue._id,
        type: 'status_updated',
        title: `Report ${statusLabel.toLowerCase()}`,
        message: `"${issue.title}" was updated to ${statusLabel}.`,
      }),
      notifyRoles({
        roles: ['admin'],
        actorId: req.user._id,
        issueId: issue._id,
        type: 'status_updated',
        title: `Report ${statusLabel.toLowerCase()}`,
        message: `"${issue.title}" was updated to ${statusLabel}.`,
      }),
    ]);
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action: 'report.status_changed',
      targetType: 'issue',
      targetId: issue._id,
      reason: resolutionNote || '',
      metadata: { from: previousStatus, to: status },
    });
    if (status === 'resolved') {
      const owner = await User.findById(issue.reportedBy);
      if (owner) {
        owner.trustScore = Math.min(100, (owner.trustScore || 0) + spamConfig.trustScorePerResolvedReport);
        await owner.save();
      }
    }
    if (issue.resolutionReview?.status === 'flagged') {
      await AuditLog.create({
        actor: req.user._id,
        actorEmail: req.user.email,
        action: 'spam.resolution_flagged',
        targetType: 'issue',
        targetId: issue._id,
        reason: issue.resolutionReview.reasons.join(', '),
        metadata: issue.resolutionReview.signalSnapshot,
      });
    }
    await issue.populate('reportedBy', 'name email');
    await issue.populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      message: `Issue status updated to ${status}`,
      data: { issue },
    });
  } catch (error) {
    try {
      await discardResolutionPhoto();
    } catch (cleanupError) {
      return next(cleanupError);
    }
    next(error);
  }
};

const assignIssue = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    if (!canAssignIssueTo(req.user, userId === 'self' ? req.user._id : userId)) {
      return res.status(403).json({
        success: false,
        message: 'Officers can assign reports only to themselves. Administrators can assign any authority user.',
      });
    }

    if (req.user.role === 'officer' && issue.assignedTo &&
        String(issue.assignedTo) !== String(req.user._id)) {
      return res.status(409).json({
        success: false,
        message: 'This report is already assigned to another authority user.',
      });
    }

    const previousAssignee = issue.assignedTo;
    if (userId === 'self') {
      issue.assignedTo = req.user._id;
    } else if (userId === null || userId === 'unassign') {
      issue.assignedTo = null;
    } else {
      const assignee = await User.findById(userId);
      if (!assignee) {
        return res.status(404).json({
          success: false,
          message: 'Assignee user not found',
        });
      }
      if (!['officer', 'admin'].includes(assignee.role)) {
        return res.status(400).json({
          success: false,
          message: 'Can only assign to officers or admins',
        });
      }
      if (!assignee.isActive || assignee.approvalStatus === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign reports to suspended or pending users.',
        });
      }
      issue.assignedTo = userId;
    }

    await issue.save();
    if (String(previousAssignee || '') !== String(issue.assignedTo || '')) {
      const assignmentMessage = issue.assignedTo
        ? `An authority user was assigned to "${issue.title}".`
        : `"${issue.title}" is no longer assigned to an authority user.`;
      await Promise.all([
        createNotifications({
          recipients: [previousAssignee, issue.assignedTo, issue.reportedBy],
          actorId: req.user._id,
          issueId: issue._id,
          type: 'report_assigned',
          title: 'Report assignment updated',
          message: assignmentMessage,
        }),
        notifyRoles({
          roles: ['admin'],
          actorId: req.user._id,
          issueId: issue._id,
          type: 'report_assigned',
          title: 'Report assignment updated',
          message: assignmentMessage,
        }),
      ]);
    }
    await issue.populate('assignedTo', 'name email');
    await issue.populate('reportedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Issue assignment updated',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const [
      byStatus,
      byCategory,
      byPriority,
      totalIssues,
      totalUsers,
      recentIssues,
      resolvedThisMonth,
    ] = await Promise.all([
      Issue.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Issue.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Issue.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Issue.countDocuments(),
      User.countDocuments({ role: 'citizen' }),
      Issue.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('reportedBy', 'name')
        .populate('assignedTo', 'name'),
      Issue.countDocuments({
        status: 'resolved',
        resolvedAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
    ]);

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const trend = await Issue.aggregate([
      { $match: { createdAt: { $gte: last30Days } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: 30 },
    ]);

    const statusMap = {};
    byStatus.forEach((item) => (statusMap[item._id] = item.count));

    const categoryMap = {};
    byCategory.forEach((item) => (categoryMap[item._id] = item.count));

    const priorityMap = {};
    byPriority.forEach((item) => (priorityMap[item._id] = item.count));

    const trendData = trend.map((t) => ({
      date: `${t._id.year}-${String(t._id.month).padStart(2, '0')}-${String(t._id.day).padStart(2, '0')}`,
      count: t.count,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalIssues,
        totalCitizens: totalUsers,
        resolvedThisMonth,
        byStatus: statusMap,
        byCategory: categoryMap,
        byPriority: priorityMap,
        recentIssues: recentIssues.map((issue) => ({
          _id: issue._id,
          title: issue.title,
          category: issue.category,
          categoryDetails: issue.categoryDetails,
          status: issue.status,
          priority: issue.priority,
          createdAt: issue.createdAt,
          reportedByName: issue.reportedBy ? issue.reportedBy.name : 'Unknown',
          assignedToName: issue.assignedTo ? issue.assignedTo.name : null,
        })),
        trend: trendData,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAuthorityUsers = async (req, res, next) => {
  try {
    const users = await User.find({
      role: { $in: ['officer', 'admin'] },
      isActive: true,
      approvalStatus: 'approved',
    }).select('_id name email role');

    res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

const flagDuplicate = async (req, res, next) => {
  try {
    const { isDuplicate, duplicateOf } = req.body;

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    issue.isDuplicateFlag = !!isDuplicate;
    issue.duplicateOf = isDuplicate && duplicateOf ? duplicateOf : null;

    await issue.save();
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action: isDuplicate ? 'report.duplicate_flagged' : 'report.duplicate_cleared',
      targetType: 'issue',
      targetId: issue._id,
      reason: isDuplicate ? 'Marked by officer/admin for duplicate review' : 'Duplicate flag removed by officer/admin',
    });

    res.status(200).json({
      success: true,
      message: isDuplicate ? 'Issue flagged as duplicate' : 'Duplicate flag removed',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateIssueStatus,
  assignIssue,
  getAnalytics,
  getAuthorityUsers,
  flagDuplicate,
};
