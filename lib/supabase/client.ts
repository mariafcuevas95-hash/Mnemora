import { createBrowserClient } from "@supabase/ssr";

// Strip any non-ISO-8859-1 characters (e.g. zero-width spaces copied from dashboards)
function sanitizeEnv(v: string | undefined, fallback: string): string {
  if (!v) return fallback;
  // eslint-disable-next-line no-control-regex
  return v.replace(/[^\x00-\xFF]/g, "").trim();
}

const SUPABASE_URL  = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL,  "https://placeholder.supabase.co");
const SUPABASE_ANON = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "placeholder-anon-key");

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
}

/** True when real credentials are present (false in local dev without .env.local) */
export const hasSupabaseCredentials =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
