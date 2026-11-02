const sharp = require('sharp');
const spamConfig = require('../config/spam');

let clipPipelinePromise;
let nsfwModelPromise;

const classifyClipImage = async (filePath, runtime, getClassifier) => {
  const { env, RawImage } = runtime;
  env.allowLocalModels = true;
  const classifier = await getClassifier();
  const labels = [...spamConfig.classifierCivicLabels, ...spamConfig.classifierNonCivicLabels]
    .map((label) => `a photo of ${label.trim()}`);
  const image = await RawImage.read(filePath);
  const results = await classifier(image, labels);
  const civic = Math.max(0, ...results
    .filter((item) => spamConfig.classifierCivicLabels.some((label) => item.label.includes(label.trim())))
    .map((item) => item.score));
  const nonCivic = Math.max(0, ...results
    .filter((item) => spamConfig.classifierNonCivicLabels.some((label) => item.label.includes(label.trim())))
    .map((item) => item.score));
  return {
    flagged: nonCivic > civic + spamConfig.classifierMargin,
    score: Math.max(0, Math.min(1, nonCivic - civic)),
    civicScore: civic,
    nonCivicScore: nonCivic,
  };
};

const classifyWithClip = async (filePath) => {
  const runtime = require('@huggingface/transformers');
  const getClassifier = () => {
    clipPipelinePromise ||= runtime.pipeline(
      'zero-shot-image-classification',
      spamConfig.classifierModel
    );
    return clipPipelinePromise;
  };
  return classifyClipImage(filePath, runtime, getClassifier);
};

const classifyWithNsfw = async (filePath) => {
  const tf = require('@tensorflow/tfjs');
  const nsfwjs = require('nsfwjs');
  const modelPath = process.env.NSFWJS_MODEL_PATH;
  if (!modelPath) throw new Error('NSFWJS_MODEL_PATH is required when IMAGE_MODERATION_PROVIDER=nsfwjs.');
  nsfwModelPromise ||= nsfwjs.load(`file://${modelPath}`);
  const model = await nsfwModelPromise;
  const { data, info } = await sharp(filePath)
    .removeAlpha()
    .resize(224, 224, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
  try {
    const predictions = await model.classify(tensor);
    const explicit = predictions.find((item) => item.className === 'Porn' || item.className === 'Hentai');
    return {
      flagged: (explicit?.probability || 0) >= spamConfig.nsfwExplicitThreshold,
      score: explicit?.probability || 0,
    };
  } finally {
    tensor.dispose();
  }
};

module.exports = { classifyWithClip, classifyWithNsfw, classifyClipImage };
