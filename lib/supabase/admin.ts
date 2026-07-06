import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL         ?? "https://placeholder.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY        ?? "placeholder-service-key";

/**
 * Supabase admin client (service role).
 * Bypasses RLS — only use in server-side code (API routes, webhooks).
 * Never expose to the browser or import from client components.
 */
export function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
