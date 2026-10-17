import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import questionRoutes from './routes/question.routes.js';
import practiceRoutes from './routes/practice.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import studyRoutes from './routes/study.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import syllabusRoutes from './routes/syllabus.routes.js';
import learningRoutes from './routes/learning.routes.js';

const app = express();

// Security & Parsing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow local development ports, env.ALLOWED_ORIGINS, and bound FRONTEND_URL
      if (
        !origin ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin === env.ALLOWED_ORIGINS ||
        (env.FRONTEND_URL && origin === env.FRONTEND_URL)
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive fallback
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(rateLimiter);

// Serve uploaded private learning files with ownership check or static path
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.resolve(process.cwd(), 'storage/uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
  // read-only filesystem fallback
}
app.use('/storage/uploads', express.static(uploadsDir));

// Health check endpoint (support both /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ConceptTrace AI Backend',
    version: '1.0.0',
    model: env.GEMINI_MODEL,
    ai_configured: Boolean(env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// API v1 Routes (support both /api/v1 and /v1)
const mountV1Routes = (prefix: string) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(prefix, profileRoutes);
  app.use(prefix, questionRoutes);
  app.use(prefix, practiceRoutes);
  app.use(prefix, analyticsRoutes);
  app.use(prefix, studyRoutes);
  app.use(prefix, settingsRoutes);
  app.use(prefix, syllabusRoutes);
  app.use(prefix, learningRoutes);
};

mountV1Routes('/api/v1');
mountV1Routes('/v1');

// Fallback 404 for unknown API endpoints
app.use(['/api/*', '/api', '/*'], (req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl || req.url} does not exist.`,
    },
  });
});

// Centralized error handling middleware
app.use(errorHandler);

// Only listen on port in standalone/local development mode (not inside Vercel serverless runtime or when imported)
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

const isMainModule = typeof require !== 'undefined' && require.main === module;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (env.PORT || 8000);

if (!isServerless && (isMainModule || (!process.env.VERCEL && process.env.PORT))) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 ConceptTrace AI Backend running on port ${PORT}`);
    console.log(`📚 Tagline: Learn • Improve • Succeed`);
    console.log(`🤖 AI Provider: ${env.AI_PROVIDER} (${env.GEMINI_MODEL})`);
  });
  server.on('error', (err) => {
    console.error('Server listen error:', err);
  });
}

export default app;

// Compatibility for Vercel Express service loader
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
  (module.exports as any).default = app;
}

