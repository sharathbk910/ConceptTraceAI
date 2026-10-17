import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const numField = (def: number) =>
  z.union([z.string(), z.number()]).default(def).transform((v) => Number(v));

const envSchema = z.object({
  PORT: numField(8000),
  NODE_ENV: z.string().default('development'),
  LOG_LEVEL: z.string().default('info'),
  
  // Supabase (optional for offline/local standalone mode)
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  VITE_SUPABASE_URL: z.string().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
  
  // AI Provider (Gemini)
  AI_PROVIDER: z.string().default('gemini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash-lite'),
  
  // Storage & Uploads
  MAX_UPLOAD_SIZE_MB: numField(10),
  MAX_UPLOAD_FILES: numField(5),
  PRIVATE_STORAGE_BUCKET: z.string().default('student-learning-files'),
  
  // Learning & Analytics Rules
  STUDY_IDLE_TIMEOUT_SECONDS: numField(120),
  MIN_ACTIVE_DAY_SECONDS: numField(300),
  WEAK_TOPIC_MIN_ATTEMPTS: numField(5),
  
  // Security
  API_RATE_LIMIT_WINDOW_MS: numField(60000),
  API_RATE_LIMIT_MAX_REQUESTS: numField(60),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  
  // Reporting
  PDF_REPORT_MAX_DAYS: numField(365),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),

  // Email & Verification
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: numField(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.union([z.string(), z.boolean()]).default('false').transform(v => String(v) === 'true'),
  EMAIL_FROM: z.string().default('ConceptTrace AI <noreply@concepttrace.ai>'),
  FRONTEND_URL: z.string().optional(),
  APP_URL: z.string().default(process.env.FRONTEND_URL || 'http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables configuration:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
