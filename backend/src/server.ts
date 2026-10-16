import express from 'express';
import cors from 'cors';
import path from 'path';
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

const app = express();

// Security & Parsing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow local development ports and env.ALLOWED_ORIGINS
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === env.ALLOWED_ORIGINS) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in development
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(rateLimiter);

// Serve uploaded private learning files with ownership check or static path
const uploadsDir = path.resolve(process.cwd(), 'storage/uploads');
app.use('/storage/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ConceptTrace AI Backend',
    version: '1.0.0',
    model: env.GEMINI_MODEL,
    ai_configured: Boolean(env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', profileRoutes);
app.use('/api/v1', questionRoutes);
app.use('/api/v1', practiceRoutes);
app.use('/api/v1', analyticsRoutes);
app.use('/api/v1', studyRoutes);
app.use('/api/v1', settingsRoutes);

// Fallback 404 for unknown API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.baseUrl} does not exist.`,
    },
  });
});

// Centralized error handling middleware
app.use(errorHandler);

const PORT = env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 ConceptTrace AI Backend running at http://localhost:${PORT}`);
  console.log(`📚 Tagline: Learn • Improve • Succeed`);
  console.log(`🤖 AI Provider: ${env.AI_PROVIDER} (${env.GEMINI_MODEL})`);
});

export default app;
