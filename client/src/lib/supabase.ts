import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

// Clean up whitespace or accidental quotes
const supabaseUrl = rawUrl.trim().replace(/^["']|["']$/g, '');
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

