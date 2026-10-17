// Entrypoint bridge for Vercel Express service
const app = require('./dist/server.js');
const handler = app.default || app;
module.exports = handler;
module.exports.default = handler;
module.exports.app = handler;
