import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";

/**
 * Service-role client. BYPASSES row-level security.
 * Use only in trusted server code: payment webhooks, ticket issuing,
 * CAPTCHA-verified public form inserts. Never import from a client component.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
