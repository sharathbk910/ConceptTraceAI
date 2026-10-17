// Entrypoint bridge for Vercel Express service
let app = null;

try {
  const mod = require('./dist/server.js');
  app = mod.default || mod;
} catch (err) {
  console.error('CRITICAL: Failed to load backend ./dist/server.js:', err);
}

const handler = app || ((req, res) => {
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    success: false,
    error: {
      code: 'BACKEND_LOAD_FAILURE',
      message: 'Backend server failed to initialize.',
    },
  }));
});

// Standalone local execution fallback only when run directly: `node backend/server.js`
if (typeof require !== 'undefined' && require.main === module && !process.env.VERCEL) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
  if (app && typeof app.listen === 'function') {
    app.listen(port, () => {
      console.log(`Backend server listening on port ${port}`);
    });
  }
}

module.exports = handler;
module.exports.default = handler;
module.exports.app = handler;
