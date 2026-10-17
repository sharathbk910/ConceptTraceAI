"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_js_1 = require("../../config/env.js");
let supabaseAdmin = null;
exports.supabaseAdmin = supabaseAdmin;
const supabaseUrl = env_js_1.env.SUPABASE_URL || env_js_1.env.VITE_SUPABASE_URL;
const serviceKey = env_js_1.env.SUPABASE_SERVICE_ROLE_KEY;
if (supabaseUrl && serviceKey) {
    try {
        exports.supabaseAdmin = supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
        console.log('⚡ Supabase Admin Client initialized for server auth operations');
    }
    catch (err) {
        console.warn('⚠️ Failed to initialize Supabase Admin Client:', err);
    }
}
