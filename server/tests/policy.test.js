const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const {
  canEditIssue,
  canDeleteIssue,
  canResolveIssue,
  canUpdateIssueStatus,
  canAssignIssueTo,
  canReviewSpam,
  canFlagSpam,
  canReopenIssue,
  isSuspended,
} = require('../utils/issuePolicy');
const { scoreReport, combineImageScores, stickySpamStatus, accountRestriction } = require('../utils/spamScoring');
const { applyConfirmedSpamStrike } = require('../utils/spamModeration');
const { normalizeEmail, findUserByEmail } = require('../utils/userEmails');
const { getJwtExpiry } = require('../utils/jwtExpiry');

test('JWT expiry is never configured below two hours and preserves longer lifetimes', () => {
  assert.equal(getJwtExpiry('30m'), '2h');
  assert.equal(getJwtExpiry(1800), '2h');
  assert.equal(getJwtExpiry('2h'), '2h');
  assert.equal(getJwtExpiry('7d'), '7d');
  assert.equal(getJwtExpiry('invalid'), 'invalid');
});

test('one normalized email resolves to the same account regardless of role input casing', async () => {
  assert.equal(normalizeEmail('  Engineer@Municipal.GOV '), 'engineer@municipal.gov');
  let query;
  const fakeUsers = {
    findOne(value) {
      query = value;
      return Promise.resolve(null);
    },
  };
  await findUserByEmail(fakeUsers, 'Engineer@Municipal.GOV');
  assert.equal(query.email.$regex, '^engineer@municipal\\.gov$');
  assert.equal(query.email.$options, 'i');
});

test('citizens alone edit their own submitted reports; admins delete only confirmed spam', () => {
  const owner = { _id: 'citizen-1', role: 'citizen' };
  const other = { _id: 'citizen-2', role: 'citizen' };
  const officer = { _id: 'officer-1', role: 'officer' };
  const admin = { _id: 'admin-1', role: 'admin' };
  const submitted = { reportedBy: owner._id, status: 'submitted' };
  const resolved = { reportedBy: owner._id, status: 'resolved' };

  assert.equal(canEditIssue(owner, submitted), true);
  assert.equal(canDeleteIssue(owner, submitted), true);
  assert.equal(canEditIssue(other, submitted), false);
  assert.equal(canDeleteIssue(other, submitted), false);
  assert.equal(canEditIssue(owner, resolved), false);
  assert.equal(canDeleteIssue(officer, submitted), false);
  assert.equal(canEditIssue(admin, resolved), false);
  assert.equal(canEditIssue(admin, submitted), false);
  assert.equal(canDeleteIssue(admin, submitted), false);
  assert.equal(canDeleteIssue(admin, { ...submitted, spamStatus: 'suspected' }), false);
  assert.equal(canDeleteIssue(admin, { ...submitted, spamStatus: 'confirmed' }), true);
  assert.equal(canDeleteIssue(admin, { ...resolved, spamStatus: 'confirmed' }), true);
});

test('officer can resolve only after in-progress and only with a resolution photo', () => {
  assert.equal(canResolveIssue('submitted', 'in_progress', false), true);
  assert.equal(canResolveIssue('in_progress', 'resolved', false), false);
  assert.equal(canResolveIssue('in_progress', 'resolved', true), true);
  assert.equal(canResolveIssue('submitted', 'resolved', true), false);
});

test('only the assigned officer or an admin can update report status', () => {
  const officer = { _id: 'officer-1', role: 'officer' };
  const otherOfficer = { _id: 'officer-2', role: 'officer' };
  const admin = { _id: 'admin-1', role: 'admin' };
  const assignedIssue = { assignedTo: 'officer-1' };

  assert.equal(canUpdateIssueStatus(officer, assignedIssue), true);
  assert.equal(canUpdateIssueStatus(otherOfficer, assignedIssue), false);
  assert.equal(canUpdateIssueStatus(officer, { assignedTo: null }), false);
  assert.equal(canUpdateIssueStatus(admin, { assignedTo: null }), true);
  assert.equal(canUpdateIssueStatus(officer, { assignedTo: { _id: 'officer-1' } }), true);
});

test('officers can assign only themselves; admins can assign other authority users', () => {
  const officer = { _id: 'officer-1', role: 'officer' };
  const admin = { _id: 'admin-1', role: 'admin' };

  assert.equal(canAssignIssueTo(officer, officer._id), true);
  assert.equal(canAssignIssueTo(officer, 'officer-2'), false);
  assert.equal(canAssignIssueTo(officer, null), false);
  assert.equal(canAssignIssueTo(admin, 'officer-2'), true);
  assert.equal(canAssignIssueTo(admin, null), true);
});

test('officers flag spam for admin review; only admins make final spam decisions', () => {
  assert.equal(canReviewSpam('officer', 'flag_spam'), true);
  assert.equal(canReviewSpam('officer', 'confirmed_spam'), false);
  assert.equal(canReviewSpam('officer', 'not_spam'), false);
  assert.equal(canReviewSpam('admin', 'flag_spam'), false);
  assert.equal(canReviewSpam('admin', 'confirmed_spam'), true);
  assert.equal(canReviewSpam('admin', 'not_spam'), true);
});

test('officers can flag unreviewed, suspected, or cleared reports, but not confirmed spam', () => {
  assert.equal(canFlagSpam({ spamStatus: 'none' }), true);
  assert.equal(canFlagSpam({ spamStatus: 'suspected' }), true);
  assert.equal(canFlagSpam({ spamStatus: 'cleared' }), true);
  assert.equal(canFlagSpam({ spamStatus: 'confirmed' }), false);
});

test('citizen can reopen a resolved owned report once', () => {
  const user = { _id: 'citizen-1', role: 'citizen' };
  assert.equal(canReopenIssue(user, { reportedBy: user._id, status: 'resolved', reopenCount: 0 }), true);
  assert.equal(canReopenIssue(user, { reportedBy: user._id, status: 'resolved', reopenCount: 1 }), false);
  assert.equal(canReopenIssue(user, { reportedBy: 'citizen-2', status: 'resolved', reopenCount: 0 }), false);
});

test('protected requests reload the user and immediately block suspended accounts', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  process.env.JWT_SECRET = 'test-secret-for-node-tests';
  User.findById = async () => ({
    _id: 'suspended-user',
    email: 'user@example.com',
    role: 'citizen',
    isActive: false,
    suspensionReason: 'Confirmed spam',
    approvalStatus: 'approved',
  });
  const req = {
    headers: {
      authorization: `Bearer ${jwt.sign({ id: 'suspended-user' }, process.env.JWT_SECRET)}`,
    },
  };
  let statusCode;
  let body;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };
  try {
    await protect(req, res, () => assert.fail('Suspended request must not continue'));
    assert.equal(statusCode, 403);
    assert.equal(body.code, 'ACCOUNT_SUSPENDED');
    assert.equal(isSuspended({ isActive: false }), true);
  } finally {
    User.findById = originalFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('spam scoring distinguishes match, mismatch, missing EXIF and duplicate images', () => {
  const base = { lat: 22.7196, lng: 75.8577 };
  const match = scoreReport({
    pin: base,
    capture: { ...base, accuracy: 10 },
    exif: { ...base },
    imageHashes: ['0000000000000000'],
    duplicateHashes: [],
    reportText: 'Broken streetlight near central park',
  });
  assert.equal(match.spamStatus, 'none');

  const mismatch = scoreReport({
    pin: base,
    capture: { lat: 22.75, lng: 75.9, accuracy: 5 },
    exif: { lat: 22.75, lng: 75.9 },
    reportText: 'Broken streetlight near central park',
  });
  assert.ok(mismatch.score > match.score);
  assert.ok(mismatch.reasons.some(({ code }) => code === 'device_location_mismatch'));
  assert.equal(combineImageScores([mismatch, mismatch]).score, mismatch.score);

  const noExif = scoreReport({ pin: base, capture: { ...base }, reportText: 'Road damage at the crossing' });
  assert.equal(noExif.score, 3);
  assert.equal(noExif.spamStatus, 'none');

  const duplicate = scoreReport({
    pin: base,
    imageHashes: ['0123456789abcdef'],
    duplicateHashes: ['0123456789abcdef'],
    reportText: 'Road damage at the crossing',
  });
  assert.ok(duplicate.reasons.some(({ code }) => code === 'reused_or_near_duplicate_image'));
});

test('cleared spam status is sticky and confirmed-spam strikes apply a daily restriction at three', () => {
  assert.equal(stickySpamStatus('cleared', 'suspected'), 'cleared');
  const user = { spamStrikeCount: 0, spamRestrictedAt: null };
  applyConfirmedSpamStrike(user, new Date('2025-01-01T00:00:00Z'));
  applyConfirmedSpamStrike(user, new Date('2025-01-02T00:00:00Z'));
  const result = applyConfirmedSpamStrike(user, new Date('2025-01-03T00:00:00Z'));
  assert.equal(result.restricted, true);
  assert.equal(user.spamStrikeCount, 3);
  assert.equal(user.spamRestrictedAt.toISOString(), '2025-01-03T00:00:00.000Z');
  assert.deepEqual(accountRestriction(user.spamStrikeCount), { restricted: true, dailyLimit: 3 });
});
