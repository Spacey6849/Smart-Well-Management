// Centralized environment variable validation for Supabase & critical services.
// Import this early in server-only code (e.g. auth routes) to fail fast if misconfigured.

interface EnvReport {
  ok: boolean;
  missing: string[];
}

export function validateSupabaseEnv(): EnvReport {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  const missing = required.filter(k => !process.env[k]);
  return { ok: missing.length === 0, missing };
}

if (process.env.NODE_ENV !== 'production') {
  const report = validateSupabaseEnv();
  if (!report.ok) {
    // eslint-disable-next-line no-console
    console.warn('[env-guard] Missing Supabase env vars:', report.missing.join(', '));
  }
}

// Utility to produce a redacted snapshot (never log secrets verbatim in production)
export function redactedEnvSnapshot() {
  const redact = (v?: string) => (v ? v.slice(0, 6) + '…' : undefined);
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: redact(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: redact(process.env.SUPABASE_SERVICE_ROLE_KEY),
    GEMINI_MODEL: process.env.GEMINI_MODEL || undefined
  };
}
