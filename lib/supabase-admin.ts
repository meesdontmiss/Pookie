import "server-only"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

let cachedClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient

  // URL may be public (it is not a secret), but the service-role key must never
  // be exposed to the client bundle — so we never read a NEXT_PUBLIC_ key name.
  const supabaseServiceUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_SUPABASE_SERVICE_KEY

  if (!supabaseServiceUrl || !supabaseServiceKey) {
    throw new Error("Supabase admin env not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC_).")
  }
  cachedClient = createClient(supabaseServiceUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
  return cachedClient
}
