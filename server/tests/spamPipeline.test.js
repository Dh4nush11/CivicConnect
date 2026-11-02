const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const exifr = require('exifr');
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const UploadToken = require('../models/UploadToken');
const { formatIssue } = require('../controllers/issueController');
const { scoreReport, haversineMeters } = require('../utils/spamScoring');
const { reverseConfirmedSpamStrike } = require('../utils/spamModeration');
const { moderateImage, publishCleanImage } = require('../utils/imageAnalysis');
const { classifyClipImage } = require('../utils/imageModeration');
const spamConfig = require('../config/spam');

test('new issue schema validates without a resolution review status', () => {
  const issue = new Issue({
    title: 'Pothole on Main Road',
    description: 'A pothole needs repair.',
    category: 'pothole',
    location: {
      type: 'Point',
      coordinates: [75.8577, 22.7196],
      address: 'Indore',
    },
    reportedBy: new mongoose.Types.ObjectId(),
  });

  assert.equal(issue.resolutionReview.status, undefined);
  assert.equal(issue.validateSync(), undefined);
});

test('issue schema stores a bounded description for the Other category', () => {
  const issue = new Issue({
    title: 'Damaged public bench',
    description: 'The bench is broken.',
    category: 'other',
    categoryDetails: '  Damaged public bench  ',
    location: {
      type: 'Point',
      coordinates: [75.8577, 22.7196],
      address: 'Indore',
    },
    reportedBy: new mongoose.Types.ObjectId(),
  });

  assert.equal(issue.categoryDetails, 'Damaged public bench');
  assert.equal(issue.validateSync(), undefined);
  issue.categoryDetails = 'x'.repeat(81);
  assert.equal(issue.validateSync().errors.categoryDetails.kind, 'maxlength');
});

test('location scoring applies the GPS-accuracy allowance; stale images and duplicates are signals', () => {
  const pin = { lat: 22.7196, lng: 75.8577 };
  const captureAt = (distance, accuracy) => ({
    lat: pin.lat,
    lng: pin.lng + distance / (111000 * Math.cos((pin.lat * Math.PI) / 180)),
    accuracy,
  });

  const near = captureAt(200, 20);
  assert.ok(haversineMeters(pin, near) < spamConfig.locationMismatchMeters);
  assert.equal(scoreReport({ pin, capture: near, reportText: 'Broken streetlight' })
    .reasons.some(({ code }) => code === 'device_location_mismatch'), false);

  const widened = captureAt(350, 200);
  assert.ok(haversineMeters(pin, widened) < widened.accuracy * 2);
  assert.equal(scoreReport({ pin, capture: widened, reportText: 'Broken streetlight' })
    .reasons.some(({ code }) => code === 'device_location_mismatch'), false);

  const outside = captureAt(350, 20);
  assert.ok(scoreReport({ pin, capture: outside, reportText: 'Broken streetlight' })
    .reasons.some(({ code }) => code === 'device_location_mismatch'));

  const oldPhoto = scoreReport({
    pin,
    exif: pin,
    exifCapturedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    imageHashes: ['0'.repeat(64)],
    duplicateHashes: ['0'.repeat(64)],
    reportText: 'Broken streetlight',
  });
  assert.ok(oldPhoto.reasons.some(({ code }) => code === 'stale_photo'));
  assert.ok(oldPhoto.reasons.some(({ code }) => code === 'reused_or_near_duplicate_image'));
});

test('missing EXIF is weak by itself, and a high trust score cannot suppress hard signals', () => {
  const pin = { lat: 22.7196, lng: 75.8577 };
  const missingExif = scoreReport({ pin, reportText: 'Damaged road near the crossing' });
  assert.equal(missingExif.spamStatus, 'none');
  assert.equal(missingExif.score, 3);

  const duplicate = scoreReport({
    pin,
    imageHashes: ['0'.repeat(64)],
    duplicateHashes: ['0'.repeat(64)],
    trustScore: 100,
    reportText: 'Damaged road near the crossing',
  });
  assert.ok(duplicate.score >= spamConfig.suspectedThreshold);
  assert.ok(duplicate.snapshot.signals.reused_or_near_duplicate_image.value > 0);
});

test('upload tokens reject expiration and only allow one successful consumption', async () => {
  const originalFindOneAndUpdate = UploadToken.findOneAndUpdate;
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  let usedAt = null;
  const queries = [];
  UploadToken.findOneAndUpdate = async (query) => {
    queries.push(query);
    if (usedAt) return null;
    usedAt = new Date();
    return { issuedAt: new Date(Date.now() - 1000) };
  };
  const response = () => ({
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });
  try {
    const consume = require('../middleware/consumeUploadToken');
    const req = { user: { _id: 'citizen-1' }, get: () => token };
    const first = response();
    let continued = false;
    await consume(req, first, () => { continued = true; });
    assert.equal(continued, true);
    assert.equal(queries[0].tokenHash, tokenHash);
    assert.equal(queries[0].user, 'citizen-1');
    assert.ok(queries[0].expiresAt.$gt > new Date(Date.now() - 1000));

    const second = response();
    await consume(req, second, () => assert.fail('A reused token must be rejected'));
    assert.equal(second.statusCode, 401);
    assert.equal(second.body.code, 'UPLOAD_TOKEN_INVALID');

    UploadToken.findOneAndUpdate = async () => null;
    const expired = response();
    await consume(req, expired, () => assert.fail('An expired token must be rejected'));
    assert.equal(expired.statusCode, 401);
    assert.equal(expired.body.code, 'UPLOAD_TOKEN_INVALID');
  } finally {
    UploadToken.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('report serialization hides private metadata and presents check failures as staff-only manual review', () => {
  const issue = {
    checkStatus: 'check_failed',
    spamStatus: 'suspected',
    spamScore: 50,
    spamReasons: ['device_location_mismatch'],
    captureLocation: { lat: 1, lng: 2 },
    exifLocation: { lat: 1, lng: 2 },
    locationDistances: { exifToPinMeters: 3 },
    signalSnapshot: { internal: true },
    decision: { reason: 'internal' },
    resolutionReview: { status: 'flagged' },
    reportedBy: null,
    images: [],
    upvotes: [],
    toObject() { return { ...this }; },
  };
  const publicView = formatIssue(issue, false, { role: 'citizen' });
  assert.equal(publicView.underReview, true);
  assert.equal(publicView.underReviewMessage, 'Your report is under review.');
  for (const field of ['checkStatus', 'spamStatus', 'spamScore', 'spamReasons', 'captureLocation',
    'exifLocation', 'locationDistances', 'signalSnapshot', 'decision', 'resolutionReview']) {
    assert.equal(Object.hasOwn(publicView, field), false);
  }

  const staffView = formatIssue(issue, false, { role: 'officer' });
  assert.equal(staffView.manualReview, true);
  assert.equal(staffView.checkStatus, 'check_failed');
});

test('confirmed-spam strike reversal clears restrictions below the configured limit', () => {
  const user = {
    spamStrikeCount: spamConfig.confirmedSpamRestrictionStrikes,
    spamRestrictedAt: new Date(),
    trustScore: 10,
  };
  const count = reverseConfirmedSpamStrike(user);
  assert.equal(count, spamConfig.confirmedSpamRestrictionStrikes - 1);
  assert.equal(user.spamRestrictedAt, null);
  assert.equal(
    user.trustScore,
    10 + spamConfig.trustScorePerConfirmedSpam + spamConfig.trustScorePerClearance
  );
});

test('classifier-off mode does not load a provider, and published images have no EXIF metadata', async () => {
  if (spamConfig.classifierProviders.every((provider) => provider === 'off')) {
    assert.equal(await moderateImage('not-a-real-image.jpg'), null);
  }

  const privateDir = path.join(__dirname, '..', 'private_uploads');
  const sourceName = `pipeline-test-${randomBytes(8).toString('hex')}.jpg`;
  const sourcePath = path.join(privateDir, sourceName);
  let publishedName;
  try {
    await fs.mkdir(privateDir, { recursive: true });
    await sharp({
      create: { width: 3, height: 3, channels: 3, background: '#336699' },
    }).jpeg().withMetadata({
      exif: { IFD0: { Artist: 'CivicConnect test fixture' } },
    }).toFile(sourcePath);
    const sourceMetadata = await exifr.parse(sourcePath, { tiff: true });
    assert.equal(sourceMetadata?.Artist, 'CivicConnect test fixture');

    publishedName = await publishCleanImage(sourcePath, sourceName);
    const publishedPath = path.join(__dirname, '..', 'uploads', publishedName);
    const publishedMetadata = await exifr.parse(publishedPath, { tiff: true });
    assert.equal(publishedMetadata, undefined);
  } finally {
    await fs.unlink(sourcePath).catch(() => {});
    if (publishedName) {
      await fs.unlink(path.join(__dirname, '..', 'uploads', publishedName)).catch(() => {});
    }
  }
});

test('enabled CLIP moderation can be exercised with a mocked local classifier', async () => {
  let classifierCalls = 0;
  let inputPath;
  const runtime = {
    env: { allowLocalModels: false },
    RawImage: { read: async (value) => { inputPath = value; return { image: true }; } },
  };
  const classification = await classifyClipImage(
    'private/photo.jpg',
    runtime,
    async () => {
      classifierCalls += 1;
      return async (_image, labels) => [
        { label: labels.find((label) => label.includes('pothole')), score: 0.2 },
        { label: labels.find((label) => label.includes('selfie')), score: 0.8 },
      ];
    }
  );
  assert.equal(classifierCalls, 1);
  assert.equal(inputPath, 'private/photo.jpg');
  assert.equal(runtime.env.allowLocalModels, true);
  assert.equal(classification.flagged, true);
  assert.ok(Math.abs(classification.score - 0.6) < Number.EPSILON * 2);
});
