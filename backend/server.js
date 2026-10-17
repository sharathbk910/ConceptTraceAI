// Entrypoint bridge for Vercel Express service
let app = null;

try {
  const mod = require('./dist/server.js');
  app = mod.default || mod;
} catch (err) {
  console.error('CRITICAL: Failed to load backend ./dist/server.js:', err);
}

// If PORT is provided (Vercel container service or standalone), start listener
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
if (port && app && typeof app.listen === 'function') {
  app.listen(port, () => {
    console.log(`🚀 ConceptTrace AI Backend listening on port ${port}`);
  });
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

module.exports = handler;
module.exports.default = handler;
module.exports.app = handler;



