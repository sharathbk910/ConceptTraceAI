"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_js_1 = require("./config/env.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
// Route imports
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const profile_routes_js_1 = __importDefault(require("./routes/profile.routes.js"));
const question_routes_js_1 = __importDefault(require("./routes/question.routes.js"));
const practice_routes_js_1 = __importDefault(require("./routes/practice.routes.js"));
const analytics_routes_js_1 = __importDefault(require("./routes/analytics.routes.js"));
const study_routes_js_1 = __importDefault(require("./routes/study.routes.js"));
const settings_routes_js_1 = __importDefault(require("./routes/settings.routes.js"));
const syllabus_routes_js_1 = __importDefault(require("./routes/syllabus.routes.js"));
const learning_routes_js_1 = __importDefault(require("./routes/learning.routes.js"));
const app = (0, express_1.default)();
// Security & Parsing
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow local development ports, env.ALLOWED_ORIGINS, and bound FRONTEND_URL
        if (!origin ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1') ||
            origin === env_js_1.env.ALLOWED_ORIGINS ||
            (env_js_1.env.FRONTEND_URL && origin === env_js_1.env.FRONTEND_URL)) {
            callback(null, true);
        }
        else {
            callback(null, true); // Permissive fallback
        }
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
app.use(rateLimiter_js_1.rateLimiter);
// Serve uploaded private learning files with ownership check or static path
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path_1.default.resolve(process.cwd(), 'storage/uploads');
try {
    if (!fs_1.default.existsSync(uploadsDir)) {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    }
}
catch {
    // read-only filesystem fallback
}
app.use('/storage/uploads', express_1.default.static(uploadsDir));
// Health check endpoint (support both /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
    res.json({
        status: 'healthy',
        service: 'ConceptTrace AI Backend',
        version: '1.0.0',
        model: env_js_1.env.GEMINI_MODEL,
        ai_configured: Boolean(env_js_1.env.GEMINI_API_KEY),
        timestamp: new Date().toISOString(),
    });
});
// API v1 Routes (support both /api/v1 and /v1)
const mountV1Routes = (prefix) => {
    app.use(`${prefix}/auth`, auth_routes_js_1.default);
    app.use(prefix, profile_routes_js_1.default);
    app.use(prefix, question_routes_js_1.default);
    app.use(prefix, practice_routes_js_1.default);
    app.use(prefix, analytics_routes_js_1.default);
    app.use(prefix, study_routes_js_1.default);
    app.use(prefix, settings_routes_js_1.default);
    app.use(prefix, syllabus_routes_js_1.default);
    app.use(prefix, learning_routes_js_1.default);
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
app.use(errorHandler_js_1.errorHandler);
// Only listen on port in standalone/local development mode (not inside Vercel serverless runtime or when imported)
const isServerless = Boolean(process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT);
const isMainModule = typeof require !== 'undefined' && require.main === module;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (env_js_1.env.PORT || 8000);
if (!isServerless && isMainModule) {
    const server = app.listen(PORT, () => {
        console.log(`🚀 ConceptTrace AI Backend running on port ${PORT}`);
        console.log(`📚 Tagline: Learn • Improve • Succeed`);
        console.log(`🤖 AI Provider: ${env_js_1.env.AI_PROVIDER} (${env_js_1.env.GEMINI_MODEL})`);
    });
    server.on('error', (err) => {
        console.error('Server listen error:', err);
    });
}
exports.default = app;
// Compatibility for Vercel Express service loader
if (typeof module !== 'undefined' && module.exports) {
    module.exports = app;
    module.exports.default = app;
}
