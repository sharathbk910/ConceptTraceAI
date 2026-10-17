// Vercel Serverless Function entrypoint for ConceptTrace AI API
let app;

try {
  const mod = require('../backend/dist/server.js');
  app = mod.default || mod;
} catch (err) {
  try {
    const mod = require('../backend/server.js');
    app = mod.default || mod;
  } catch (innerErr) {
    console.error('Failed to load backend server in serverless runtime:', innerErr);
    const express = require('express');
    app = express();
    app.all('*', (req, res) => {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVERLESS_LOAD_ERROR',
          message: 'Serverless backend failed to load.',
          details: String(innerErr && innerErr.message ? innerErr.message : innerErr),
        },
      });
    });
  }
}

module.exports = app;
module.exports.default = app;
