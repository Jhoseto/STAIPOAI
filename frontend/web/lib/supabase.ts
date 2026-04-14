import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const getSupabaseClient = (): SupabaseClient => {
  const isBrowser = typeof window !== "undefined";
  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    (isBrowser ? (window as any).__ENV?.NEXT_PUBLIC_SUPABASE_URL : undefined);
  const supabaseAnonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    (isBrowser ? (window as any).__ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined);

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isBrowser) {
      console.warn("Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    return createBrowserClient(
      supabaseUrl || "https://placeholder.supabase.co",
      supabaseAnonKey || "placeholder-anon-key",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// Singleton instance
let _supabase: SupabaseClient | null = null;

// Proxy to allow transparent lazy initialization
export const supabase = new Proxy({} as unknown as SupabaseClient, {
  get(target, prop) {
    if (!_supabase) {
      _supabase = getSupabaseClient();
    }
    return (_supabase as any)[prop];
  },
});

