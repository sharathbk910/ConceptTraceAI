import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

let supabaseAdmin: SupabaseClient | null = null;

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && serviceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('⚡ Supabase Admin Client initialized for server auth operations');
  } catch (err) {
    console.warn('⚠️ Failed to initialize Supabase Admin Client:', err);
  }
}

export { supabaseAdmin };
