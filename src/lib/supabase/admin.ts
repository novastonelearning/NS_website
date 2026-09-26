import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client: bypasses every RLS policy. Import only from server
// actions and route handlers — never from a component that reaches the browser.
// The key has no NEXT_PUBLIC_ prefix, so Next will not bundle it for the client.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (Project Settings > API > service_role).");
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
