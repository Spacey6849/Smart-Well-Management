import { createClient } from '@supabase/supabase-js';
import { redactedEnvSnapshot } from '../env-guard';

function sanitize(v?: string) {
  if (!v) return v as any;
  const trimmed = v.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const url = sanitize(rawUrl)!;
const anon = sanitize(rawAnon)!;

if (!url || !anon) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[supabase/client] Missing Supabase env vars', redactedEnvSnapshot());
  }
} else if (process.env.NODE_ENV !== 'production') {
  if (rawAnon && rawAnon.trim().startsWith('"')) {
    console.warn('[supabase/client] Anon key had wrapping quotes; they were stripped. Remove quotes in .env');
  }
  console.log('[supabase/client] Supabase browser client configured', redactedEnvSnapshot());
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export function getSupabase() { return supabase; }

export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anon;
