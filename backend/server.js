// Entrypoint bridge for Vercel Express service with error diagnostics
let app = null;
let initError = null;

try {
  const mod = require('./dist/server.js');
  app = mod.default || mod;
} catch (err) {
  initError = err ? { message: err.message, stack: err.stack } : String(err);
  console.error('CRITICAL: Failed to load backend ./dist/server.js:', initError);
}

const expressHandler = (req, res) => {
  if (initError || !app) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: {
        code: 'BACKEND_LOAD_FAILURE',
        message: 'Backend server failed to initialize.',
        details: initError,
      },
    }, null, 2));
    return;
  }

  try {
    return app(req, res);
  } catch (dispatchErr) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: {
        code: 'BACKEND_DISPATCH_FAILURE',
        message: 'Backend failed during request handling.',
        details: dispatchErr ? { message: dispatchErr.message, stack: dispatchErr.stack } : String(dispatchErr),
      },
    }, null, 2));
  }
};

// Retain Express application prototype and members if app loaded successfully
if (app) {
  Object.setPrototypeOf(expressHandler, app);
  Object.assign(expressHandler, app);
}

// If PORT is provided (Vercel Services container/runtime or direct launch), listen on that port
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
if (port && app && typeof app.listen === 'function') {
  app.listen(port, () => {
    console.log(`🚀 ConceptTrace AI Backend listening on port ${port}`);
  });
}

module.exports = expressHandler;
module.exports.default = expressHandler;
module.exports.app = expressHandler;


