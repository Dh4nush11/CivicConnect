const enabled = (value) => value === 'true';
const number = (value, fallback) => Number.isFinite(Number(value)) && Number(value) >= 0
  ? Number(value)
  : fallback;

module.exports = Object.freeze({
  locationMismatchMeters: number(process.env.SPAM_LOCATION_THRESHOLD_METERS, 300),
  locationAccuracyMultiplier: number(process.env.SPAM_LOCATION_ACCURACY_MULTIPLIER, 2),
  locationMismatchWeight: number(process.env.SPAM_LOCATION_WEIGHT, 0.35),
  missingExifWeight: number(process.env.SPAM_MISSING_EXIF_WEIGHT, 0.03),
  duplicateImageWeight: number(process.env.SPAM_DUPLICATE_WEIGHT, 0.45),
  stalePhotoWeight: number(process.env.SPAM_STALE_PHOTO_WEIGHT, 0.15),
  stalePhotoAgeHours: number(process.env.SPAM_STALE_PHOTO_AGE_HOURS, 24),
  behaviourWeight: number(process.env.SPAM_BEHAVIOUR_WEIGHT, 0.1),
  reportsPerHour: number(process.env.SPAM_REPORTS_PER_HOUR, 5),
  reportsPerHourWeight: number(process.env.SPAM_REPORTS_PER_HOUR_WEIGHT, 0.2),
  newAccountAgeHours: number(process.env.SPAM_NEW_ACCOUNT_AGE_HOURS, 24),
  newAccountBurstCount: number(process.env.SPAM_NEW_ACCOUNT_BURST_COUNT, 3),
  confirmedSpamRestrictionStrikes: number(process.env.SPAM_RESTRICTION_STRIKES, 3),
  restrictedDailyReports: number(process.env.SPAM_RESTRICTED_DAILY_LIMIT, 3),
  suspectedThreshold: number(process.env.SPAM_SUSPECTED_THRESHOLD, 35),
  duplicateHashDistance: number(process.env.SPAM_DUPLICATE_HASH_DISTANCE, 8),
  repeatedTextMinimumLength: number(process.env.SPAM_REPEATED_TEXT_MIN_LENGTH, 12),
  repeatedTextRepeatedCharacterCount: number(process.env.SPAM_REPEATED_TEXT_REPEAT_COUNT, 9),
  lowInformationTextMinimumLength: number(process.env.SPAM_LOW_INFORMATION_TEXT_MIN_LENGTH, 20),
  lowInformationTextUniqueCharacterLimit: number(process.env.SPAM_LOW_INFORMATION_UNIQUE_CHAR_LIMIT, 3),
  trustScorePerResolvedReport: number(process.env.SPAM_TRUST_RESOLVED_BONUS, 2),
  trustScorePerClearance: number(process.env.SPAM_TRUST_CLEAR_BONUS, 3),
  trustScorePerConfirmedSpam: number(process.env.SPAM_TRUST_SPAM_PENALTY, 5),
  trustScoreReduction: number(process.env.SPAM_TRUST_SCORE_REDUCTION, 0.15),
  uploadTokenTtlMinutes: number(process.env.UPLOAD_TOKEN_TTL_MINUTES, 15),
  captureTimestampWindowMinutes: number(process.env.CAPTURE_TIMESTAMP_WINDOW_MINUTES, 15),
  classifierProviders: (process.env.IMAGE_MODERATION_PROVIDER || 'off')
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean),
  classifierModel: process.env.CLIP_MODEL || 'Xenova/clip-vit-base-patch32',
  classifierCivicLabels: (process.env.CLIP_CIVIC_LABELS || 'pothole,garbage pile,broken streetlight,waterlogging,damaged road,open drain,fallen tree').split(','),
  classifierNonCivicLabels: (process.env.CLIP_NON_CIVIC_LABELS || 'selfie,meme,screenshot,indoor room,document,food').split(','),
  classifierMargin: number(process.env.CLIP_CLASSIFIER_MARGIN, 0.05),
  nsfwExplicitThreshold: number(process.env.NSFWJS_EXPLICIT_THRESHOLD, 0.7),
  indoreBoundaryEnforcement: enabled(process.env.INDORE_BOUNDARY_ENFORCEMENT),
});
