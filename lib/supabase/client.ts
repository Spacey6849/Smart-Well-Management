import { createClient } from '@supabase/supabase-js';

// Enforce environment configuration (prevents silent fallback + 'Failed to fetch').
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!rawUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local and restart the dev server.');
}
if (!rawAnon) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Add it to .env.local and restart the dev server.');
}

// Detect placeholder values (avoid confusing DNS errors like NAME_NOT_RESOLVED)
const PLACEHOLDER_URL_TOKEN = 'YOUR_SUPABASE_PROJECT_REF';
const PLACEHOLDER_KEY_TOKEN = 'YOUR_ANON_PUBLIC_KEY';
if (rawUrl.includes(PLACEHOLDER_URL_TOKEN)) {
  throw new Error('Supabase URL placeholder detected. Replace YOUR_SUPABASE_PROJECT_REF with your project ref in .env.local.');
}
if (rawAnon.includes(PLACEHOLDER_KEY_TOKEN)) {
  throw new Error('Supabase anon key placeholder detected. Replace YOUR_ANON_PUBLIC_KEY with the real anon key in .env.local.');
}

// Basic validation to catch typos (e.g. "your_supabase_project") before network call.
const URL_PATTERN = /^https:\/\/([a-zA-Z0-9-]+)\.supabase\.co$/;
if (!URL_PATTERN.test(rawUrl)) {
  // Allow custom domains but warn in dev.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('[Supabase] URL does not match expected pattern *.supabase.co ->', rawUrl);
  }
}

export const SUPABASE_URL = rawUrl;
export const SUPABASE_ANON_KEY = rawAnon;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Development helper: quick health probe (runs once, non-blocking)
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (async () => {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/health`, { cache: 'no-store' });
      if (!r.ok) console.warn('[Supabase] Auth health endpoint not OK:', r.status);
    } catch (e) {
      console.warn('[Supabase] Unable to reach auth health endpoint. Check URL / network / DNS.', e);
    }
  })();
}
