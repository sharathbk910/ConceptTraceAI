import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';

let aiClient: GoogleGenAI | null = null;

if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
  try {
    aiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    console.log(`✨ Gemini AI Client initialized with model: ${env.GEMINI_MODEL}`);
  } catch (err) {
    console.warn('⚠️ Failed to initialize GoogleGenAI client:', err);
  }
} else {
  console.log('ℹ️ GEMINI_API_KEY not configured. Running in educational offline/deterministic mode.');
}

export { aiClient };
