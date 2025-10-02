import { createClient } from '@supabase/supabase-js';
import { redactedEnvSnapshot } from './env-guard';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()!;

let logged = false;
if (!url || !service) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[supabase/server] Missing Supabase service env vars', redactedEnvSnapshot());
  }
} else if (!logged && process.env.NODE_ENV !== 'production') {
  logged = true;
  console.log('[supabase/server] Initialized Supabase server client', redactedEnvSnapshot());
}

export function supabaseServer() {
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'ecowell-app' } }
  });
}

export type SupabaseServerClient = ReturnType<typeof supabaseServer>;
