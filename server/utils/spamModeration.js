const spamConfig = require('../config/spam');

const applyConfirmedSpamStrike = (user, now = new Date()) => {
  user.spamStrikeCount = (user.spamStrikeCount || 0) + 1;
  const restricted = user.spamStrikeCount >= spamConfig.confirmedSpamRestrictionStrikes;
  const newlyRestricted = restricted && !user.spamRestrictedAt;
  if (newlyRestricted) user.spamRestrictedAt = now;
  return { strikeCount: user.spamStrikeCount, restricted, newlyRestricted };
};

const reverseConfirmedSpamStrike = (user) => {
  user.spamStrikeCount = Math.max(0, (user.spamStrikeCount || 0) - 1);
  if (user.spamStrikeCount < spamConfig.confirmedSpamRestrictionStrikes) {
    user.spamRestrictedAt = null;
  }
  user.trustScore = Math.min(
    100,
    (user.trustScore || 0) +
      spamConfig.trustScorePerConfirmedSpam +
      spamConfig.trustScorePerClearance
  );
  return user.spamStrikeCount;
};

module.exports = { applyConfirmedSpamStrike, reverseConfirmedSpamStrike };
