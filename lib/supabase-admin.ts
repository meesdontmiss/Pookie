import { createClient } from "@supabase/supabase-js"

const supabaseServiceUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseServiceUrl) {
  throw new Error("SUPABASE_URL is required for server-side Supabase access.")
}

if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_KEY is required for server-side Supabase access.")
}

export const supabaseAdmin = createClient(supabaseServiceUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
})
