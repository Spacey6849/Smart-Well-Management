import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  // Fail fast in dev; in prod this would surface misconfiguration quickly.
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[supabase/client] Missing Supabase env vars');
  }
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
