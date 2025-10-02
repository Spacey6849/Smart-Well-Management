import { createClient } from '@supabase/supabase-js';
import { redactedEnvSnapshot } from './env-guard';

function sanitize(v?: string) {
  if (!v) return v as any;
  const trimmed = v.trim();
  // Remove wrapping single OR double quotes if present
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawService = process.env.SUPABASE_SERVICE_ROLE_KEY;
const url = sanitize(rawUrl)!;
const service = sanitize(rawService)!;

let logged = false;
if (!url || !service) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[supabase/server] Missing Supabase service env vars', redactedEnvSnapshot());
  }
} else if (!logged && process.env.NODE_ENV !== 'production') {
  logged = true;
  if (rawService && rawService.trim().startsWith('"')) {
    console.warn('[supabase/server] Service role key had wrapping quotes; they were stripped. Consider removing quotes in .env');
  }
  console.log('[supabase/server] Initialized Supabase server client', redactedEnvSnapshot());
}

export function supabaseServer() {
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'ecowell-app' } }
  });
}

export type SupabaseServerClient = ReturnType<typeof supabaseServer>;
