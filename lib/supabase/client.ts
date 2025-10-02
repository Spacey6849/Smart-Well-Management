import { createClient } from '@supabase/supabase-js';
import { redactedEnvSnapshot } from '../env-guard';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()!;

if (!url || !anon) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[supabase/client] Missing Supabase env vars', redactedEnvSnapshot());
  }
} else if (process.env.NODE_ENV !== 'production') {
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
