process.chdir(require('path').join(__dirname, '..', 'server'));

const app = require('../server/server');

module.exports = (req, res) => {
  if (!req.path) req.path = req.url.split('?')[0];
  app(req, res);
};
