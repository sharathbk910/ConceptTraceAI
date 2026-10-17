// Vercel Serverless Function entrypoint for ConceptTrace AI API
let app = null;
let initError = null;

try {
  const mod = require('../backend/dist/server.js');
  app = mod.default || mod;
} catch (err) {
  try {
    const mod = require('../backend/server.js');
    app = mod.default || mod;
  } catch (innerErr) {
    initError = {
      primary: err ? { message: err.message, stack: err.stack } : String(err),
      fallback: innerErr ? { message: innerErr.message, stack: innerErr.stack } : String(innerErr),
    };
    console.error('Failed to load backend server in serverless runtime:', initError);
  }
}

module.exports = (req, res) => {
  if (initError || !app) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: {
        code: 'SERVERLESS_LOAD_ERROR',
        message: 'Serverless backend failed to load.',
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
        code: 'SERVERLESS_DISPATCH_ERROR',
        message: 'Error during request dispatching in serverless runtime.',
        details: dispatchErr ? { message: dispatchErr.message, stack: dispatchErr.stack } : String(dispatchErr),
      },
    }, null, 2));
  }
};

