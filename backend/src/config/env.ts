import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  PORT: z.string().default('8000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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
  MAX_UPLOAD_SIZE_MB: z.string().default('10').transform(Number),
  MAX_UPLOAD_FILES: z.string().default('5').transform(Number),
  PRIVATE_STORAGE_BUCKET: z.string().default('student-learning-files'),
  
  // Learning & Analytics Rules
  STUDY_IDLE_TIMEOUT_SECONDS: z.string().default('120').transform(Number),
  MIN_ACTIVE_DAY_SECONDS: z.string().default('300').transform(Number),
  WEAK_TOPIC_MIN_ATTEMPTS: z.string().default('5').transform(Number),
  
  // Security
  API_RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  API_RATE_LIMIT_MAX_REQUESTS: z.string().default('60').transform(Number),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  
  // Reporting
  PDF_REPORT_MAX_DAYS: z.string().default('365').transform(Number),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),

  // Email & Verification
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.string().default('false').transform(v => v === 'true'),
  EMAIL_FROM: z.string().default('ConceptTrace AI <noreply@concepttrace.ai>'),
  APP_URL: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables configuration:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
