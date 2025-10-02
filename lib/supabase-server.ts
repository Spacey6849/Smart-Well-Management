import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !service) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[supabase/server] Missing Supabase service env vars');
  }
}

export function supabaseServer() {
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'ecowell-app' } }
  });
}

export type SupabaseServerClient = ReturnType<typeof supabaseServer>;
