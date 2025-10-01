import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const supabaseServer = () => {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { 'X-Client-Info': 'ecowell-app' }
    }
  });
};
export type SupabaseServerClient = ReturnType<typeof supabaseServer>;
