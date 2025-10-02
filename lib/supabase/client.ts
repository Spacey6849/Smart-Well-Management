// Supabase client deprecated after migration to MySQL.
// This stub remains only to fail fast if any leftover imports persist.

// Provide a minimal no-op supabase-like placeholder so existing imports don't break the build.
// All methods throw if called to surface unintended usage at runtime.
export const supabase: any = new Proxy(
  {},
  {
    get() {
      throw new Error('Supabase deprecated: remove usage');
    }
  }
);

export function getSupabase() {
  return supabase;
}

export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
