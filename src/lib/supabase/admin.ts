import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: SupabaseClient<any> | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): SupabaseClient<any> {
  return (_client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  ));
}
