import { createClient, SupabaseClient } from "@supabase/supabase-js"

let cachedClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient
  const supabaseServiceUrl = process.env.SUPABASE_URL
  // Support either SERVICE_KEY or SERVICE_ROLE_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseServiceUrl || !supabaseServiceKey) {
    throw new Error("Supabase admin env not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
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
