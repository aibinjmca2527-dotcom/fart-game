import { createClient } from '@supabase/supabase-js';

const rawUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://bigyokpeslbzupiiukdw.supabase.co';
const rawKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZ3lva3Blc2xienVwaWl1a2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzIzOTMsImV4cCI6MjEwODUwODM5M30.Lnjwv6M1G9BFHRCRqsDJmgRU5mnDhx_65WlAq-UNcMg';

// Clean up whitespace, accidental quotes, and accidental suffixes like /rest/v1 or /auth/v1
const supabaseUrl = rawUrl
  .trim()
  .replace(/^["']|["']$/g, '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/auth\/v1\/?$/, '')
  .replace(/\/+$/, '');
const supabaseAnonKey = rawKey.trim().replace(/^["']|["']$/g, '');

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'placeholder_anon_key' &&
  supabaseAnonKey.length > 20
);

// Fallback to a valid dummy URL if placeholder to avoid client crashing
const safeUrl = isSupabaseConfigured ? supabaseUrl : 'https://example.supabase.co';
const safeKey = isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

