const MIN_TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1000;

const durationInMilliseconds = (duration) => {
  if (typeof duration === 'number') return duration * 1000;
  if (typeof duration !== 'string') return null;

  const match = duration.match(/^(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?|m|minutes?|h|hours?|d|days?|w|weeks?|y|years?)?$/i);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();
  const multiplier = unit.startsWith('ms') || unit.startsWith('millisecond') ? 1
    : unit.startsWith('s') ? 1000
      : unit.startsWith('m') ? 60 * 1000
        : unit.startsWith('h') ? 60 * 60 * 1000
          : unit.startsWith('d') ? 24 * 60 * 60 * 1000
            : unit.startsWith('w') ? 7 * 24 * 60 * 60 * 1000
              : 365 * 24 * 60 * 60 * 1000;

  return value * multiplier;
};

const getJwtExpiry = (configured = process.env.JWT_EXPIRES_IN || '7d') => {
  const duration = durationInMilliseconds(configured);
  return duration !== null && duration < MIN_TOKEN_LIFETIME_MS ? '2h' : configured;
};

module.exports = { getJwtExpiry };
