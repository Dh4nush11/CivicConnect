const test = require('node:test');
const assert = require('node:assert/strict');
const { getCloudinaryPublicId } = require('../utils/mediaStorage');

test('Cloudinary image URLs resolve to their stored asset public IDs', () => {
  assert.equal(
    getCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v1730000000/civic-connect/report.jpg'),
    'civic-connect/report'
  );
  assert.equal(
    getCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/civic-connect/report.jpg'),
    'civic-connect/report'
  );
});

test('non-Cloudinary URLs are not treated as managed media assets', () => {
  assert.equal(getCloudinaryPublicId('https://example.com/uploads/report.jpg'), null);
});
