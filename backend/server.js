// Entrypoint bridge for Vercel Express service
const app = require('./dist/server.js');
module.exports = app.default || app;
