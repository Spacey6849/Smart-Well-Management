import { createClient } from '@supabase/supabase-js';
import { redactedEnvSnapshot } from './env-guard';

function sanitize(v?: string) {
  if (!v) return '';
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

const url = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
const service = sanitize(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (process.env.NODE_ENV !== 'production') {
  console.log('[supabase/server] init', redactedEnvSnapshot());
}

export function supabaseServer() {
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  if (!service) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'ecowell/server' } }
  });
}
export type SupabaseServerClient = ReturnType<typeof supabaseServer>;
