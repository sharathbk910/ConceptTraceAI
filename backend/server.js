// Entrypoint bridge for Vercel Express service with error diagnostics
let handler;

try {
  const app = require('./dist/server.js');
  handler = app.default || app;
} catch (err) {
  console.error('CRITICAL: Failed to load backend ./dist/server.js:', err);
  const express = require('express');
  const fallback = express();
  fallback.use((req, res) => {
    res.status(500).json({
      success: false,
      error: {
        code: 'BACKEND_LOAD_FAILURE',
        message: 'Backend server failed to initialize.',
        details: err && err.message ? err.message : String(err),
        stack: err && err.stack ? err.stack : undefined,
      },
    });
  });
  handler = fallback;
}

module.exports = handler;
module.exports.default = handler;
module.exports.app = handler;
