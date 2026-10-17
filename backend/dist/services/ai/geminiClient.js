"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiClient = void 0;
const genai_1 = require("@google/genai");
const env_js_1 = require("../../config/env.js");
let aiClient = null;
exports.aiClient = aiClient;
if (env_js_1.env.GEMINI_API_KEY && env_js_1.env.GEMINI_API_KEY.trim() !== '') {
    try {
        exports.aiClient = aiClient = new genai_1.GoogleGenAI({ apiKey: env_js_1.env.GEMINI_API_KEY });
        console.log(`✨ Gemini AI Client initialized with model: ${env_js_1.env.GEMINI_MODEL}`);
    }
    catch (err) {
        console.warn('⚠️ Failed to initialize GoogleGenAI client:', err);
    }
}
else {
    console.log('ℹ️ GEMINI_API_KEY not configured. Running in educational offline/deterministic mode.');
}
