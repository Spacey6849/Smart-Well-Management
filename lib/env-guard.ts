interface EnvReport { ok: boolean; missing: string[] }

export function validateSupabaseEnv(): EnvReport {
  const required = [ 'NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY' ];
  const missing = required.filter(k => !process.env[k]);
  return { ok: missing.length === 0, missing };
}

export function redactedEnvSnapshot() {
  const redact = (v?: string) => (v ? v.slice(0,6)+'…' : undefined);
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: redact(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: redact(process.env.SUPABASE_SERVICE_ROLE_KEY)
  };
}

if (process.env.NODE_ENV !== 'production') {
  const rep = validateSupabaseEnv();
  if (!rep.ok) console.warn('[env-guard] Missing Supabase env vars:', rep.missing.join(', '));
}
