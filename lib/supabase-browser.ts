import { supabase } from './supabase/client';

// Return the shared singleton instead of creating new instances (prevents multiple GoTrueClient warnings)
export const supabaseBrowser = () => supabase;
export type SupabaseBrowserClient = typeof supabase;
