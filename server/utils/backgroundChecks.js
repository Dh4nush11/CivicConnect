const fs = require('fs/promises');
const BackgroundCheck = require('../models/BackgroundCheck');
const Issue = require('../models/Issue');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { analyzeImages, publishCleanImage } = require('./imageAnalysis');
const { scoreReport, combineImageScores, stickySpamStatus, reasonSummary } = require('./spamScoring');
const spamConfig = require('../config/spam');

let active = false;
let timer;
let recoveryTimer;

const processCheck = async (job) => {
  const heartbeat = setInterval(() => {
    BackgroundCheck.updateOne(
      { _id: job._id, status: 'processing' },
      { $set: { lockedAt: new Date() } }
    ).catch((error) => console.error(`Background check heartbeat failed: ${error.message}`));
  }, 60000);
  heartbeat.unref();
  let issue;
  try {
    issue = await Issue.findById(job.issue);
  } catch (error) {
    clearInterval(heartbeat);
    throw error;
  }
  if (!issue) {
    try {
      await BackgroundCheck.deleteOne({ _id: job._id });
      for (const filePath of job.filePaths) await fs.unlink(filePath).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    } finally {
      clearInterval(heartbeat);
    }
    return;
  }

  let published = [];
  try {
    const files = job.filePaths.map((filePath, index) => ({
      path: filePath,
      filename: job.fileNames[index],
    }));
    const analyses = await analyzeImages(files);
    const prior = await Issue.find({ _id: { $ne: issue._id }, imageHashes: { $exists: true, $ne: [] } })
      .select('imageHashes')
      .lean();
    const duplicateHashes = prior.flatMap((report) => report.imageHashes || []);
    const owner = await User.findById(issue.reportedBy).select('createdAt spamStrikeCount trustScore');
    const reportsLastHour = await Issue.countDocuments({
      reportedBy: issue.reportedBy,
      _id: { $ne: issue._id },
      createdAt: { $gte: new Date(Date.now() - 3600000) },
    });
    const confirmedSpamReports = await Issue.countDocuments({
      reportedBy: issue.reportedBy,
      spamStatus: 'confirmed',
    });
    const [lng, lat] = issue.location.coordinates;
    const now = new Date();
    const scoringInputs = analyses.length
      ? analyses.map(({ exif, hash, moderation }) => ({
        exif: exif.location,
        hash,
        moderation,
        exifCapturedAt: exif.capturedAt,
      }))
      : [{ exif: null, hash: null, moderation: null, exifCapturedAt: null }];
    const results = scoringInputs.map(({ exif, hash, moderation, exifCapturedAt }) => scoreReport({
      pin: { lat, lng },
      capture: issue.captureLocation,
      exif,
      imageHashes: hash ? [hash] : [],
      duplicateHashes,
      reportText: `${issue.title} ${issue.description}`,
      reportsLastHour,
      accountAgeHours: owner ? (now - owner.createdAt) / 3600000 : 0,
      confirmedSpamReports,
      moderation,
      exifCapturedAt,
      trustScore: owner?.trustScore || 0,
      classifierValues: moderation,
      uploadAt: issue.createdAt,
      now,
    }));
    const combined = combineImageScores(results, owner?.trustScore || 0);
    for (let index = 0; index < files.length; index += 1) {
      published.push(await publishCleanImage(files[index].path, files[index].filename));
    }

    issue.images = [...(issue.images || []), ...published];
    issue.imageHashes = [...(issue.imageHashes || []), ...analyses.map((item) => item.hash)];
    issue.imageHash = analyses[0]?.hash || issue.imageHash || '';
    issue.exifLocation = analyses.find((item) => item.exif.location)?.exif.location || undefined;
    issue.exifTakenAt = analyses.find((item) => item.exif.capturedAt)?.exif.capturedAt || null;
    issue.locationDistances = combined.distances;
    issue.spamScore = combined.score;
    issue.spamReasons = combined.reasons;
    issue.signalSnapshot = {
      ...combined.snapshot,
      accuracy: issue.captureLocation?.accuracy ?? null,
      imageSignals: analyses.map((item) => item.moderation),
      weights: {
        locationMismatchMeters: spamConfig.locationMismatchMeters,
        locationAccuracyMultiplier: spamConfig.locationAccuracyMultiplier,
        locationMismatchWeight: spamConfig.locationMismatchWeight,
        missingExifWeight: spamConfig.missingExifWeight,
        duplicateHashDistance: spamConfig.duplicateHashDistance,
        duplicateImageWeight: spamConfig.duplicateImageWeight,
        stalePhotoAgeHours: spamConfig.stalePhotoAgeHours,
        stalePhotoWeight: spamConfig.stalePhotoWeight,
        behaviourWeight: spamConfig.behaviourWeight,
        newAccountAgeHours: spamConfig.newAccountAgeHours,
        newAccountBurstCount: spamConfig.newAccountBurstCount,
        reportsPerHour: spamConfig.reportsPerHour,
        reportsPerHourWeight: spamConfig.reportsPerHourWeight,
        repeatedTextMinimumLength: spamConfig.repeatedTextMinimumLength,
        repeatedTextRepeatedCharacterCount: spamConfig.repeatedTextRepeatedCharacterCount,
        lowInformationTextMinimumLength: spamConfig.lowInformationTextMinimumLength,
        lowInformationTextUniqueCharacterLimit: spamConfig.lowInformationTextUniqueCharacterLimit,
        suspectedThreshold: spamConfig.suspectedThreshold,
        trustScoreReduction: spamConfig.trustScoreReduction,
        classifierMargin: spamConfig.classifierMargin,
        nsfwExplicitThreshold: spamConfig.nsfwExplicitThreshold,
      },
    };
    issue.spamStatus = stickySpamStatus(issue.spamStatus, combined.spamStatus);
    issue.checkStatus = 'checked';
    await issue.save();
    if (issue.spamStatus === 'suspected') {
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
  } catch (error) {
    for (let index = 0; index < job.filePaths.length; index += 1) {
      try {
        const cleanName = await publishCleanImage(job.filePaths[index], job.fileNames[index]);
        if (!published.includes(cleanName)) published.push(cleanName);
      } catch {
        // Failed sanitization means this source image stays private and is not published.
      }
    }
    if (published.length) issue.images = [...(issue.images || []), ...published];
    issue.checkStatus = 'check_failed';
    issue.signalSnapshot = { error: error.message, needsManualReview: true };
    await issue.save();
    console.error(`Background report check failed for ${issue._id}: ${error.message}`);
  } finally {
    clearInterval(heartbeat);
    for (const filePath of job.filePaths) await fs.unlink(filePath).catch((error) => {
      if (error.code !== 'ENOENT') console.error(`Failed to remove staged upload ${filePath}: ${error.message}`);
    });
    await BackgroundCheck.deleteOne({ _id: job._id });
  }
};

const runPending = async () => {
  if (active) return;
  active = true;
  try {
    const job = await BackgroundCheck.findOneAndUpdate(
      { status: 'pending' },
      { $set: { status: 'processing', lockedAt: new Date() } },
      { new: true, sort: { createdAt: 1 } }
    );
    if (job) await processCheck(job);
  } catch (error) {
    console.error(`Background check worker error: ${error.message}`);
  } finally {
    active = false;
  }
};

const startBackgroundChecks = () => {
  if (timer) return;
  const recover = () => BackgroundCheck.updateMany(
    { status: 'processing', lockedAt: { $lt: new Date(Date.now() - 10 * 60000) } },
    { $set: { status: 'pending', lockedAt: null } }
  ).catch((error) => console.error(`Could not recover stale background checks: ${error.message}`));
  recover();
  recoveryTimer = setInterval(recover, 60000);
  recoveryTimer.unref();
  timer = setInterval(runPending, 1000);
  timer.unref();
  runPending();
};

module.exports = { startBackgroundChecks };
