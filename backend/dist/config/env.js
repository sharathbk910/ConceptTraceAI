"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// Load environment variables from backend/.env or root .env
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../.env') });
const numField = (def) => zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).default(def).transform((v) => Number(v));
const envSchema = zod_1.z.object({
    PORT: numField(8000),
    NODE_ENV: zod_1.z.string().default('development'),
    LOG_LEVEL: zod_1.z.string().default('info'),
    // Supabase (optional for offline/local standalone mode)
    SUPABASE_URL: zod_1.z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional(),
    VITE_SUPABASE_URL: zod_1.z.string().optional(),
    VITE_SUPABASE_ANON_KEY: zod_1.z.string().optional(),
    // AI Provider (Gemini)
    AI_PROVIDER: zod_1.z.string().default('gemini'),
    GEMINI_API_KEY: zod_1.z.string().optional(),
    GEMINI_MODEL: zod_1.z.string().default('gemini-3.5-flash-lite'),
    // Storage & Uploads
    MAX_UPLOAD_SIZE_MB: numField(10),
    MAX_UPLOAD_FILES: numField(5),
    PRIVATE_STORAGE_BUCKET: zod_1.z.string().default('student-learning-files'),
    // Learning & Analytics Rules
    STUDY_IDLE_TIMEOUT_SECONDS: numField(120),
    MIN_ACTIVE_DAY_SECONDS: numField(300),
    WEAK_TOPIC_MIN_ATTEMPTS: numField(5),
    // Security
    API_RATE_LIMIT_WINDOW_MS: numField(60000),
    API_RATE_LIMIT_MAX_REQUESTS: numField(60),
    ALLOWED_ORIGINS: zod_1.z.string().default('http://localhost:5173'),
    // Reporting
    PDF_REPORT_MAX_DAYS: numField(365),
    DEFAULT_TIMEZONE: zod_1.z.string().default('Asia/Kolkata'),
    // Email & Verification
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: numField(587),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_SECURE: zod_1.z.union([zod_1.z.string(), zod_1.z.boolean()]).default('false').transform(v => String(v) === 'true'),
    EMAIL_FROM: zod_1.z.string().default('ConceptTrace AI <noreply@concepttrace.ai>'),
    FRONTEND_URL: zod_1.z.string().optional(),
    APP_URL: zod_1.z.string().default(process.env.FRONTEND_URL || 'http://localhost:5173'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables configuration:', parsed.error.format());
    throw new Error('Invalid environment configuration');
}
exports.env = parsed.data;
