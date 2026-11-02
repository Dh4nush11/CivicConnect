const crypto = require('crypto');

const generateHexToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

module.exports = { generateHexToken, hashToken };
