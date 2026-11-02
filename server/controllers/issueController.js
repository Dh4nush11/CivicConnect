const { validationResult } = require('express-validator');
const Issue = require('../models/Issue');
const Comment = require('../models/Comment');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const spamConfig = require('../config/spam');
const { canEditIssue, canDeleteIssue, canReopenIssue, isOfficer } = require('../utils/issuePolicy');
const {
  scoreReport,
  combineImageScores,
  stickySpamStatus,
  accountRestriction,
  mergeReasons,
  reasonSummary,
} = require('../utils/spamScoring');
const { analyzeImages, removeFiles, publishCleanImage } = require('../utils/imageAnalysis');
const BackgroundCheck = require('../models/BackgroundCheck');
const UploadToken = require('../models/UploadToken');
const { randomBytes, createHash } = require('crypto');
const { createNotifications, notifyRoles } = require('../utils/notifications');

const { deletePublishedImages } = require('../utils/mediaStorage');

const formatIssue = (issue, includeReportedByName = true, viewer = null) => {
  const obj = issue.toObject();
  if (includeReportedByName && obj.reportedBy && obj.reportedBy.name) {
    obj.reportedByName = obj.reportedBy.name;
  }
  if (obj.assignedTo && obj.assignedTo.name) {
    obj.assignedToName = obj.assignedTo.name;
  }
  obj.upvoteCount = (obj.upvotes || []).length;
  if (obj.images) {
    obj.images = obj.images.map((img) =>
      /^https?:\/\//i.test(img) ? img : `/uploads/${img}`
    );
  }
  if (obj.resolutionPhoto && !/^https?:\/\//i.test(obj.resolutionPhoto)) {
    obj.resolutionPhoto = `/uploads/${obj.resolutionPhoto}`;
  }
  if (!isOfficer(viewer?.role)) {
    const needsReview = ['pending_check', 'check_failed', 'suspected', 'confirmed'].includes(obj.checkStatus) ||
      ['suspected', 'confirmed'].includes(obj.spamStatus);
    delete obj.captureLocation;
    delete obj.exifLocation;
    delete obj.exifTakenAt;
    delete obj.locationDistances;
    delete obj.imageHashes;
    delete obj.imageHash;
    delete obj.signalSnapshot;
    delete obj.decision;
    delete obj.resolutionReview;
    delete obj.checkStatus;
    delete obj.spamStatus;
    delete obj.spamScore;
    delete obj.spamReasons;
    obj.underReview = needsReview;
    obj.checkPending = obj.underReview && issue.checkStatus === 'pending_check';
    if (obj.underReview) obj.underReviewMessage = 'Your report is under review.';
  } else if (obj.checkStatus === 'check_failed') {
    obj.manualReview = true;
  }
  return obj;
};

const parseCaptureLocation = (value) => {
  if (!value) return null;
  let parsed;
  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    const error = new Error('Capture location must be valid JSON.');
    error.statusCode = 400;
    throw error;
  }
  if (!parsed || typeof parsed !== 'object') {
    const error = new Error('Capture location must be an object.');
    error.statusCode = 400;
    throw error;
  }
  const lat = Number(parsed.lat);
  const lng = Number(parsed.lng);
  const accuracy = Number(parsed.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const error = new Error('Capture location must contain valid latitude and longitude.');
    error.statusCode = 400;
    throw error;
  }
  const capturedAt = parsed.capturedAt ? new Date(parsed.capturedAt) : null;
  if (!capturedAt || Number.isNaN(capturedAt.getTime())) {
    const error = new Error('Capture location must include a valid capturedAt timestamp.');
    error.statusCode = 400;
    throw error;
  }
  return {
    lat,
    lng,
    ...(Number.isFinite(accuracy) && accuracy >= 0 ? { accuracy } : {}),
    capturedAt,
  };
};

const discardUploads = async (req) => {
  if (req.files?.length) await removeFiles(req.files);
};

const validateCaptureTimestamp = (captureLocation, uploadToken) => {
  if (!captureLocation?.capturedAt) return;
  const capturedAt = captureLocation.capturedAt.getTime();
  const issuedAt = uploadToken?.issuedAt?.getTime();
  const age = Date.now() - capturedAt;
  if (!issuedAt || capturedAt < issuedAt - 30000 || age < 0 ||
      age > spamConfig.captureTimestampWindowMinutes * 60000) {
    const error = new Error('Capture timestamp is outside the active upload session. Reopen the report form and capture a new photo.');
    error.statusCode = 400;
    error.code = 'CAPTURE_TIMESTAMP_INVALID';
    throw error;
  }
};

const createUploadToken = async (req, res, next) => {
  try {
    const value = randomBytes(32).toString('hex');
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + spamConfig.uploadTokenTtlMinutes * 60000);
    await UploadToken.create({
      tokenHash: createHash('sha256').update(value).digest('hex'),
      user: req.user._id,
      issuedAt,
      expiresAt,
    });
    res.status(201).json({ success: true, data: { token: value, issuedAt, expiresAt } });
  } catch (error) {
    next(error);
  }
};

const createIssue = async (req, res, next) => {
  let backgroundJobCreated = false;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await discardUploads(req);
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join(', '),
      });
    }

    const { title, description, category, categoryDetails, lat, lng, address, priority } = req.body;
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (lat === undefined || lng === undefined || lat === '' || lng === '' ||
        !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        await discardUploads(req);
        return res.status(400).json({
        success: false,
        message: 'Valid location coordinates are required',
      });
    }

    const recentCount = await Issue.countDocuments({
      reportedBy: req.user._id,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });
    const userReportsToday = await Issue.countDocuments({
      reportedBy: req.user._id,
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    const restriction = accountRestriction(req.user.spamStrikeCount || 0);
    if (restriction.restricted && userReportsToday >= restriction.dailyLimit) {
      await discardUploads(req);
      return res.status(429).json({
        success: false,
        message: `Your account is limited to ${restriction.dailyLimit} reports per day following confirmed spam decisions.`,
        code: 'DAILY_REPORT_LIMIT',
      });
    }
    if (recentCount >= spamConfig.reportsPerHour) {
      await discardUploads(req);
      return res.status(429).json({
        success: false,
        message: 'You have reached the report limit for this hour. Please try again later.',
        code: 'REPORT_RATE_LIMIT',
      });
    }

    const captureLocation = parseCaptureLocation(req.body.captureLocation);
    validateCaptureTimestamp(captureLocation, req.uploadToken);

    const issue = await Issue.create({
      title,
      description,
      category,
      categoryDetails: category === 'other' ? categoryDetails.trim() : '',
      images: [],
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
        address,
      },
      priority: priority || 'medium',
      reportedBy: req.user._id,
      captureLocation,
      checkStatus: 'pending_check',
    });
    const files = req.files || [];
    try {
      await BackgroundCheck.create({
        issue: issue._id,
        filePaths: files.map((file) => file.path),
        fileNames: files.map((file) => file.filename),
      });
      backgroundJobCreated = true;
    } catch (queueError) {
      console.error(`Could not enqueue image checks for report ${issue._id}: ${queueError.message}`);
      const cleanImages = [];
      for (const file of files) {
        try {
          cleanImages.push(await publishCleanImage(file.path, file.filename));
        } catch (sanitizationError) {
          console.error(`Could not sanitize staged image ${file.filename}: ${sanitizationError.message}`);
        }
      }
      issue.images = cleanImages;
      issue.checkStatus = 'check_failed';
      issue.signalSnapshot = { error: 'Background image checks could not be queued.', needsManualReview: true };
      await issue.save();
      await removeFiles(files);
    }

    await issue.populate('reportedBy', 'name');
    await Promise.all([
      createNotifications({
        recipients: [issue.reportedBy._id],
        issueId: issue._id,
        type: 'report_received',
        title: 'Report submitted',
        message: `Your report "${issue.title}" was submitted successfully.`,
      }),
      notifyRoles({
        roles: ['officer', 'admin'],
        actorId: req.user._id,
        issueId: issue._id,
        type: 'new_report',
        title: 'New report submitted',
        message: `A new report needs review: "${issue.title}".`,
      }),
    ]);

    res.status(201).json({
      success: true,
      message: 'Issue reported successfully',
      data: { issue: formatIssue(issue, true, req.user) },
    });
  } catch (error) {
    if (req.files?.length && !backgroundJobCreated) {
      try {
        await removeFiles(req.files);
      } catch (cleanupError) {
        return next(cleanupError);
      }
    }
    next(error);
  }
};

const updateIssue = async (req, res, next) => {
  let issuePersisted = false;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await discardUploads(req);
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join(', '),
      });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      await discardUploads(req);
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    if (!canEditIssue(req.user, issue)) {
      await discardUploads(req);
      return res.status(403).json({
        success: false,
        message: 'Only the owner can edit a submitted report.',
      });
    }

    const { title, description, category, categoryDetails, priority, lat, lng, address, removeImages } = req.body;
    if (req.body.status !== undefined) {
      await discardUploads(req);
      return res.status(403).json({ success: false, message: 'Citizens cannot change report status.' });
    }
    if (title) issue.title = title;
    if (description) issue.description = description;
    const nextCategory = category || issue.category;
    const nextCategoryDetails = nextCategory === 'other'
      ? String(categoryDetails ?? issue.categoryDetails ?? '').trim()
      : '';
    if (nextCategory === 'other' && !nextCategoryDetails) {
      await discardUploads(req);
      return res.status(400).json({
        success: false,
        message: 'Please specify the issue category when selecting Other.',
      });
    }
    if (category) issue.category = category;
    issue.categoryDetails = nextCategoryDetails;
    if (priority) issue.priority = priority;

    if (lat !== undefined && lng !== undefined && lat !== '' && lng !== '') {
      issue.location = {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
        address: address || issue.location.address,
      };
    } else if (address) {
      issue.location.address = address;
    }
    if (req.body.captureLocation) {
      issue.captureLocation = parseCaptureLocation(req.body.captureLocation);
      validateCaptureTimestamp(issue.captureLocation, req.uploadToken);
    }

    let existingImages = issue.images || [];
    const removedImages = [];
    if (removeImages && Array.isArray(removeImages)) {
      const toRemove = new Set(removeImages);
      existingImages = existingImages.filter((img) => {
        if (toRemove.has(img) || toRemove.has(`/uploads/${img}`)) {
          removedImages.push(img);
          return false;
        }
        return true;
      });
    }

    if (req.files && req.files.length > 0) {
      const current = existingImages.length;
      const space = Math.max(0, 5 - current);
      const newImageAnalysis = await analyzeImages(req.files.slice(0, space));
      const toAdd = [];
      for (const file of req.files.slice(0, space)) {
        toAdd.push(await publishCleanImage(file.path, file.filename));
      }
      existingImages = [...existingImages, ...toAdd];
      await Promise.all(req.files.map((file) => removeFiles([file])));
      const previousImages = await Issue.find({ _id: { $ne: issue._id }, imageHashes: { $exists: true, $ne: [] } })
        .select('imageHashes')
        .lean();
      const duplicateHashes = previousImages.flatMap((previous) => previous.imageHashes || []);
      const [issueLng, issueLat] = issue.location.coordinates;
      const reportsLastHour = await Issue.countDocuments({
        reportedBy: req.user._id,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      });
      const confirmedSpamReports = await Issue.countDocuments({ reportedBy: req.user._id, spamStatus: 'confirmed' });
      const previousSpamStatus = issue.spamStatus;
      const scores = newImageAnalysis.map(({ exif, hash, moderation }) => scoreReport({
        pin: { lat: issueLat, lng: issueLng },
        capture: issue.captureLocation,
        exif: exif.location,
        imageHashes: [hash],
        duplicateHashes,
        reportText: `${issue.title} ${issue.description}`,
        reportsLastHour,
        accountAgeHours: (Date.now() - req.user.createdAt) / 3600000,
        confirmedSpamReports,
        moderation,
        exifCapturedAt: exif.capturedAt,
        trustScore: req.user.trustScore || 0,
      }));
      const combinedScores = combineImageScores(scores, req.user.trustScore || 0);
      if (!['cleared', 'confirmed'].includes(issue.spamStatus)) {
        issue.spamScore = Math.max(issue.spamScore || 0, combinedScores.score);
        issue.spamReasons = mergeReasons(issue.spamReasons || [], combinedScores.reasons);
        issue.spamStatus = stickySpamStatus(issue.spamStatus, combinedScores.spamStatus);
      }
      issue.imageHashes = [...(issue.imageHashes || []), ...newImageAnalysis.map((item) => item.hash)];
      issue.imageHash = newImageAnalysis[0]?.hash || issue.imageHash;
      const exifResult = newImageAnalysis.find((item) => item.exif.location)?.exif;
      if (exifResult) {
        issue.exifLocation = exifResult.location;
        issue.exifTakenAt = exifResult.capturedAt;
      }
      issue.locationDistances = combinedScores.distances;
      issue.signalSnapshot = combinedScores.snapshot;
      if (issue.spamStatus === 'suspected' && previousSpamStatus !== 'suspected') {
        await AuditLog.create({
          actor: null,
          actorEmail: 'system@civicconnect.local',
          action: 'spam.flagged',
          targetType: 'issue',
          targetId: issue._id,
          reason: reasonSummary(issue.spamReasons),
          metadata: { spamScore: issue.spamScore, signalSnapshot: issue.signalSnapshot },
        });
      }
    }
    issue.images = existingImages;
    await issue.save();
    issuePersisted = true;
    await deletePublishedImages(removedImages);
    await issue.populate('reportedBy', 'name');
    await issue.populate('assignedTo', 'name email');
    await notifyRoles({
      roles: ['admin'],
      actorId: req.user._id,
      issueId: issue._id,
      type: 'report_updated',
      title: 'Report details updated',
      message: `Report details were updated: "${issue.title}".`,
    });
    if (issue.assignedTo?._id) {
      await createNotifications({
        recipients: [issue.assignedTo._id],
        actorId: req.user._id,
        issueId: issue._id,
        type: 'report_updated',
        title: 'Assigned report updated',
        message: `The details of "${issue.title}" were updated.`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Issue updated successfully',
      data: { issue: formatIssue(issue, true, req.user) },
    });
  } catch (error) {
    if (req.files?.length && !issuePersisted) {
      try {
        await removeFiles(req.files);
      } catch (cleanupError) {
        return next(cleanupError);
      }
    }
    next(error);
  }
};

const deleteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }
    if (!canDeleteIssue(req.user, issue)) {
      return res.status(403).json({
        success: false,
        message: req.user.role === 'admin'
          ? 'Administrators can delete only reports confirmed as spam.'
          : 'Only the owner can delete a submitted report.',
      });
    }

    const images = [...(issue.images || []), issue.resolutionPhoto].filter(Boolean);
    await deletePublishedImages(images);

    await Comment.deleteMany({ issueId: issue._id });
    await Issue.findByIdAndDelete(issue._id);
    if (req.user.role === 'admin') {
      await createNotifications({
        recipients: [issue.reportedBy],
        actorId: req.user._id,
        type: 'report_removed',
        title: 'Report removed',
        message: `Your report "${issue.title}" was removed after an administrator confirmed it as spam.`,
      });
    }
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action: 'report.deleted',
      targetType: 'issue',
      targetId: issue._id,
      reason: req.user.role === 'admin'
        ? String(req.body.reason || 'Administrator deleted report').trim()
        : 'Report owner deleted submitted report',
    });

    res.status(200).json({
      success: true,
      message: 'Issue deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getIssues = async (req, res, next) => {
  try {
    const {
      category,
      status,
      near,
      radius,
      area,
      spamStatus,
      page = 1,
      limit = 10,
      sort = 'newest',
    } = req.query;

    const query = {};
    if (isOfficer(req.user?.role)) {
      query.checkStatus = { $ne: 'pending_check' };
    } else {
      query.$or = [
        { checkStatus: { $ne: 'pending_check' } },
        ...(req.user?._id ? [{ reportedBy: req.user._id }] : []),
      ];
    }
    if (category && category !== 'all') query.category = category;
    if (status && status !== 'all') query.status = status;
    if (area && isOfficer(req.user?.role)) {
      const escapedArea = String(area).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query['location.address'] = { $regex: escapedArea, $options: 'i' };
    }
    if (spamStatus && isOfficer(req.user?.role) &&
        ['none', 'suspected', 'confirmed', 'cleared'].includes(spamStatus)) query.spamStatus = spamStatus;

    if (near) {
      const [lng, lat] = near.split(',').map(Number);
      const r = radius ? parseFloat(radius) / 6378.1 : 10 / 6378.1;
      query.location = {
        $geoWithin: { $centerSphere: [[lng, lat], r] },
      };
    }

    const sortOptions = {};
    if (sort === 'upvotes') sortOptions.upvotes = -1;
    else if (sort === 'oldest') sortOptions.createdAt = 1;
    else sortOptions.createdAt = -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [issues, total] = await Promise.all([
      Issue.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('reportedBy', 'name')
        .populate('assignedTo', 'name'),
      Issue.countDocuments(query),
    ]);

    const formattedIssues = issues.map((issue) => formatIssue(issue, true, req.user));

    res.status(200).json({
      success: true,
      data: {
        issues: formattedIssues,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getIssueById = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy', 'name')
      .populate('assignedTo', 'name email');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }
    if (issue.checkStatus === 'pending_check' &&
        (!req.user || String(issue.reportedBy?._id || issue.reportedBy) !== String(req.user._id))) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    const comments = await Comment.find({ issueId: issue._id })
      .sort({ createdAt: 1 })
      .populate('userId', 'name role');

    res.status(200).json({
      success: true,
      data: {
        issue: formatIssue(issue, true, req.user),
        comments: comments.map((c) => ({
          _id: c._id,
          text: c.text,
          createdAt: c.createdAt,
          userId: c.userId ? c.userId._id : null,
          userName: c.userId ? c.userId.name : 'Unknown',
          userRole: c.userId ? c.userId.role : 'citizen',
        })),
        isUpvoted: req.user
          ? issue.upvotes.includes(req.user._id)
          : false,
      },
    });
  } catch (error) {
    next(error);
  }
};

const reopenIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Report not found.' });
    if (!canReopenIssue(req.user, issue)) {
      if (String(issue.reportedBy) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'You can only reopen your own report.' });
      }
      return res.status(400).json({ success: false, message: 'Only a resolved report can be reopened once.' });
    }
    issue.status = 'submitted';
    issue.reopenCount += 1;
    issue.resolvedAt = null;
    await issue.save();
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action: 'report.reopened',
      targetType: 'issue',
      targetId: issue._id,
      reason: String(req.body.reason || '').trim(),
    });
    await Promise.all([
      notifyRoles({
        roles: ['admin'],
        actorId: req.user._id,
        issueId: issue._id,
        type: 'report_reopened',
        title: 'Report reopened',
        message: `The reporter reopened "${issue.title}" for review.`,
      }),
      createNotifications({
        recipients: [issue.assignedTo],
        actorId: req.user._id,
        issueId: issue._id,
        type: 'report_reopened',
        title: 'Assigned report reopened',
        message: `"${issue.title}" was reopened by the reporter.`,
      }),
    ]);
    res.json({ success: true, data: { issue: formatIssue(issue, true, req.user) } });
  } catch (error) {
    next(error);
  }
};

const upvoteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const userId = req.user._id.toString();
    const hasUpvoted = issue.upvotes.some((id) => id.toString() === userId);

    if (hasUpvoted) {
      issue.upvotes = issue.upvotes.filter((id) => id.toString() !== userId);
    } else {
      issue.upvotes.push(req.user._id);
    }

    await issue.save();

    res.status(200).json({
      success: true,
      message: hasUpvoted ? 'Upvote removed' : 'Upvote added',
      data: {
        upvoteCount: issue.upvotes.length,
        isUpvoted: !hasUpvoted,
      },
    });
  } catch (error) {
    next(error);
  }
};

const addComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join(', '),
      });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const comment = await Comment.create({
      issueId: issue._id,
      userId: req.user._id,
      text: req.body.text,
    });

    await comment.populate('userId', 'name role');
    await Promise.all([
      createNotifications({
        recipients: [issue.reportedBy, issue.assignedTo],
        actorId: req.user._id,
        issueId: issue._id,
        type: 'report_comment',
        title: 'New report update',
        message: `${comment.userId.name} added an update to "${issue.title}".`,
      }),
      notifyRoles({
        roles: ['admin'],
        actorId: req.user._id,
        issueId: issue._id,
        type: 'report_comment',
        title: 'New report update',
        message: `${comment.userId.name} added an update to "${issue.title}".`,
      }),
    ]);

    res.status(201).json({
      success: true,
      message: 'Comment added',
      data: {
        comment: {
          _id: comment._id,
          text: comment.text,
          createdAt: comment.createdAt,
          userId: comment.userId._id,
          userName: comment.userId.name,
          userRole: comment.userId.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMyIssues = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { reportedBy: req.user._id };
    if (status && status !== 'all') query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [issues, total] = await Promise.all([
      Issue.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('assignedTo', 'name'),
      Issue.countDocuments(query),
    ]);

    const formattedIssues = issues.map((issue) => formatIssue(issue, true, req.user));

    res.status(200).json({
      success: true,
      data: {
        issues: formattedIssues,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getNearbyDuplicates = async (req, res, next) => {
  try {
    const { category, lat, lng, radius = 50 } = req.query;
    if (!category || !lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'category, lat, and lng are required',
      });
    }

    const distanceInKm = parseFloat(radius) / 1000;
    const centerSphere = [
      [parseFloat(lng), parseFloat(lat)],
      distanceInKm / 6378.1,
    ];

    const duplicates = await Issue.find({
      category,
      status: { $ne: 'resolved' },
      location: { $geoWithin: { $centerSphere: centerSphere } },
    }).limit(10).populate('reportedBy', 'name');

    res.status(200).json({
      success: true,
      data: {
        duplicates: duplicates.map((issue) => formatIssue(issue, true, req.user)),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIssue,
  updateIssue,
  deleteIssue,
  getIssues,
  getIssueById,
  upvoteIssue,
  addComment,
  getMyIssues,
  getNearbyDuplicates,
  reopenIssue,
  createUploadToken,
  formatIssue,
};
