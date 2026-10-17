// Bridge forwarding to server.js
const handler = require('./server.js');
module.exports = handler;
module.exports.default = handler;
module.exports.app = handler;

