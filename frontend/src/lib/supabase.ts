import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://mukdhjntfmuxufujiznm.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11a2Roam50Zm11eHVmdWppem5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNjg0NzgsImV4cCI6MjEwNzc0NDQ3OH0.NqtqEIA-G0aB9C4hMvJP44__efjg0pG5QAmRQMAefdI';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseUrl.trim() !== '' && supabaseAnonKey && supabaseAnonKey.trim() !== ''
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
