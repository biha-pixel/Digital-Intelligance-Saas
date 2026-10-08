import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Creates an elevated Supabase admin client using the SUPABASE_SERVICE_ROLE_KEY.
 * STRICT SECURITY WARNING:
 * - This client bypasses Row Level Security (RLS).
 * - NEVER import or call this function in Client Components or send this client to browser code.
 * - Used strictly for background worker queues, cron triggers, and server-side ingestion jobs.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-supabase.co";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
