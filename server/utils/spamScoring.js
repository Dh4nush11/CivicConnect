const config = require('../config/spam');

const reasonText = Object.freeze({
  device_location_mismatch: 'Device GPS is far from the pinned report location.',
  photo_location_mismatch: 'Photo EXIF GPS is far from the pinned report location.',
  photo_metadata_unavailable: 'Photo location metadata is unavailable; this is a weak signal.',
  stale_photo: 'Photo timestamp is older than the configured freshness window.',
  reused_or_near_duplicate_image: 'Image is identical or near-identical to an existing report image.',
  new_account_report_burst: 'A new account submitted several reports in a short period.',
  high_reporting_rate: 'The account is near the hourly report limit.',
  previous_confirmed_spam: 'The account has prior confirmed-spam decisions.',
  repeated_text: 'Report text contains repeated characters.',
  low_information_text: 'Report text contains very little distinct information.',
  image_moderation_flag: 'Optional image classifier marked the image as potentially unrelated.',
});

const formatReasons = (reasons) => {
  const codes = reasons.map((reason) => typeof reason === 'string' ? reason : reason.code);
  return [...new Set(codes)].map((code) => ({ code, text: reasonText[code] || 'Automated review signal.' }));
};

const mergeReasons = (...groups) => formatReasons(groups.flat());
const reasonSummary = (reasons = []) => reasons.map((reason) =>
  typeof reason === 'string' ? reason : `${reason.code}: ${reason.text}`
).join(', ');

const EARTH_RADIUS_METERS = 6371000;

const haversineMeters = (a, b) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(b.lng - a.lng);
  const value = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const hammingDistance = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return Infinity;
  if (/^[01]{64}$/.test(left) && /^[01]{64}$/.test(right)) {
    let distance = 0;
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) distance += 1;
    }
    return distance;
  }
  if (!/^[\da-f]+$/i.test(left) || !/^[\da-f]+$/i.test(right)) return Infinity;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    let value = parseInt(left[index], 16) ^ parseInt(right[index], 16);
    while (value) {
      distance += value & 1;
      value >>>= 1;
    }
  }
  return distance;
};

const scoreReport = ({
  pin,
  capture,
  exif,
  imageHashes = [],
  duplicateHashes = [],
  reportText = '',
  reportsLastHour = 0,
  accountAgeHours = Infinity,
  confirmedSpamReports = 0,
  moderation = null,
  exifCapturedAt = null,
  trustScore = 0,
  classifierValues = null,
  uploadAt = null,
  now = new Date(),
}) => {
  const reasons = [];
  const signalScores = {};
  const signalWeights = {
    device_location_mismatch: config.locationMismatchWeight,
    photo_location_mismatch: config.locationMismatchWeight,
    photo_metadata_unavailable: config.missingExifWeight,
    stale_photo: config.stalePhotoWeight,
    reused_or_near_duplicate_image: config.duplicateImageWeight,
    new_account_report_burst: config.behaviourWeight,
    high_reporting_rate: config.reportsPerHourWeight,
    previous_confirmed_spam: config.behaviourWeight,
    repeated_text: config.behaviourWeight,
    low_information_text: config.behaviourWeight,
    image_moderation_flag: config.behaviourWeight,
  };
  const signalValues = Object.fromEntries(Object.entries(signalWeights).map(([code, weight]) => [
    code,
    { value: 0, weight },
  ]));
  const addSignal = (reason, value, weight) => {
    const signalValue = Math.max(signalValues[reason]?.value || 0, Math.max(0, Math.min(1, value)));
    signalValues[reason] = {
      value: signalValue,
      weight,
    };
    if (signalValue > 0) signalScores[reason] = signalValues[reason];
    reasons.push(reason);
  };
  const distances = {};
  const accuracy = Number.isFinite(Number(capture?.accuracy)) ? Math.max(0, Number(capture.accuracy)) : 0;
  const mismatchThreshold = Math.max(
    config.locationMismatchMeters,
    accuracy * config.locationAccuracyMultiplier
  );

  if (pin && capture && Number.isFinite(capture.lat) && Number.isFinite(capture.lng)) {
    distances.deviceToPinMeters = haversineMeters(pin, capture);
    distances.deviceMismatchThresholdMeters = mismatchThreshold;
    if (distances.deviceToPinMeters > mismatchThreshold) {
      addSignal('device_location_mismatch', 1, config.locationMismatchWeight);
    }
  }
  if (pin && exif && Number.isFinite(exif.lat) && Number.isFinite(exif.lng)) {
    distances.exifToPinMeters = haversineMeters(pin, exif);
    if (distances.exifToPinMeters > mismatchThreshold) {
      addSignal('photo_location_mismatch', 1, config.locationMismatchWeight);
    }
  } else {
    addSignal('photo_metadata_unavailable', 1, config.missingExifWeight);
  }

  const photoCaptureTime = exifCapturedAt || exif?.capturedAt;
  let photoAgeHours = null;
  if (photoCaptureTime) {
    photoAgeHours = (new Date(uploadAt || now).getTime() - new Date(photoCaptureTime).getTime()) / 3600000;
    if (photoAgeHours > config.stalePhotoAgeHours) {
      addSignal('stale_photo', 1, config.stalePhotoWeight);
    }
  }

  let closestHashDistance = Infinity;
  for (const hash of imageHashes) {
    for (const previous of duplicateHashes) {
      closestHashDistance = Math.min(closestHashDistance, hammingDistance(hash, previous));
    }
  }
  if (closestHashDistance <= config.duplicateHashDistance) {
    addSignal('reused_or_near_duplicate_image', 1, config.duplicateImageWeight);
  }

  if (reportsLastHour >= config.newAccountBurstCount && accountAgeHours <= config.newAccountAgeHours) {
    addSignal('new_account_report_burst', 1, config.behaviourWeight);
  }
  if (reportsLastHour >= config.reportsPerHour - 1) {
    addSignal('high_reporting_rate', 1, config.reportsPerHourWeight);
  }
  if (confirmedSpamReports > 0) {
    addSignal(
      'previous_confirmed_spam',
      Math.min(1, confirmedSpamReports / config.confirmedSpamRestrictionStrikes),
      config.behaviourWeight
    );
  }

  const normalizedText = String(reportText).trim().toLowerCase();
  const compactText = normalizedText.replace(/\s/g, '');
  if (compactText.length >= config.repeatedTextMinimumLength &&
      new Set(compactText).size === 1 &&
      compactText.length >= config.repeatedTextRepeatedCharacterCount) {
    addSignal('repeated_text', 1, config.behaviourWeight);
  } else if (compactText.length >= config.lowInformationTextMinimumLength &&
      new Set(compactText).size <= config.lowInformationTextUniqueCharacterLimit) {
    addSignal('low_information_text', 1, config.behaviourWeight);
  }
  if (moderation?.flagged) {
    addSignal('image_moderation_flag', Number(moderation.score) || 1, config.behaviourWeight);
  }

  const rawScore = Math.min(1, Object.values(signalValues)
    .reduce((total, signal) => total + signal.value * signal.weight, 0));
  const hasHardSignal = Boolean(
    signalScores.device_location_mismatch ||
    signalScores.photo_location_mismatch ||
    signalScores.reused_or_near_duplicate_image
  );
  const trustedReduction = (Math.max(0, Math.min(100, trustScore)) / 100) * config.trustScoreReduction;
  const finalScore = Math.max(hasHardSignal ? config.suspectedThreshold / 100 : 0, rawScore - trustedReduction);
  const score = Math.round(Math.min(1, finalScore) * 100);
  const spamStatus = score >= config.suspectedThreshold ? 'suspected' : 'none';
  return {
    score,
    reasons: formatReasons(reasons),
    spamStatus,
    distances,
    signalScores,
    snapshot: {
      signals: signalValues,
      distances,
      inputs: {
        locationMismatchMeters: config.locationMismatchMeters,
        locationAccuracyMultiplier: config.locationAccuracyMultiplier,
        gpsAccuracyMeters: accuracy,
        closestHashDistance: Number.isFinite(closestHashDistance) ? closestHashDistance : null,
        stalePhotoAgeHours: photoAgeHours,
        reportsLastHour,
        accountAgeHours,
        confirmedSpamReports,
        reportTextLength: normalizedText.length,
        classifierValues: classifierValues || moderation,
        uploadAt: new Date(uploadAt || now),
      },
      rawScore,
      trustScore,
      score,
    },
  };
};

const combineImageScores = (results, trustScore = 0) => {
  const signalScores = {};
  const signalValues = {};
  const distances = {};
  for (const result of results) {
    for (const [reason, signal] of Object.entries(result.signalScores || {})) {
      if (!signalScores[reason] || signal.value > signalScores[reason].value) {
        signalScores[reason] = signal;
      }
    }
    for (const [reason, signal] of Object.entries(result.snapshot?.signals || {})) {
      if (!signalValues[reason] || signal.value > signalValues[reason].value) {
        signalValues[reason] = signal;
      }
    }
    Object.assign(distances, result.distances);
  }
  const rawScore = Math.min(1, Object.values(signalValues)
    .reduce((total, signal) => total + signal.value * signal.weight, 0));
  const hardSignal = ['device_location_mismatch', 'photo_location_mismatch', 'reused_or_near_duplicate_image']
    .some((key) => signalScores[key]);
  const trustedReduction = (Math.max(0, Math.min(100, trustScore)) / 100) * config.trustScoreReduction;
  const score = Math.round(Math.max(
    hardSignal ? config.suspectedThreshold / 100 : 0,
    rawScore - trustedReduction
  ) * 100);
  return {
    score,
    reasons: formatReasons(Object.keys(signalScores)),
    signalScores,
    distances,
    snapshot: {
      signals: signalValues,
      perImage: results.map((result) => result.snapshot),
      distances,
      rawScore,
      trustScore,
      score,
    },
    spamStatus: score >= config.suspectedThreshold ? 'suspected' : 'none',
  };
};

const stickySpamStatus = (currentStatus, automaticStatus) =>
  ['cleared', 'confirmed'].includes(currentStatus) ? currentStatus : automaticStatus;

const accountRestriction = (strikeCount) => ({
  restricted: strikeCount >= config.confirmedSpamRestrictionStrikes,
  dailyLimit: strikeCount >= config.confirmedSpamRestrictionStrikes
    ? config.restrictedDailyReports
    : null,
});

module.exports = {
  haversineMeters,
  hammingDistance,
  scoreReport,
  combineImageScores,
  stickySpamStatus,
  accountRestriction,
  formatReasons,
  mergeReasons,
  reasonSummary,
};
