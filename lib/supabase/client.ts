import { createClient } from '@supabase/supabase-js';
import { redactedEnvSnapshot } from '../env-guard';

function sanitize(v?: string){
  if(!v) return '';
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1,-1);
  return t;
}
const url = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anon = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
if (!url || !anon) {
  if (process.env.NODE_ENV !== 'production') console.warn('[supabase/client] Missing Supabase env vars', redactedEnvSnapshot());
} else if (process.env.NODE_ENV !== 'production') {
  console.log('[supabase/client] configured', redactedEnvSnapshot());
}
export const supabase = createClient(url, anon, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }, global:{ headers:{ 'X-Client-Info':'ecowell/browser'} } });
export function getSupabase(){ return supabase; }
