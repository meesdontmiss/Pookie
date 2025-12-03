import { createClient } from '@supabase/supabase-js'

// Supabase configuration for Plug Penguin
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required in .env.local for client-side Supabase.')
}
if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required in .env.local for client-side Supabase.')
}

// Initialize Supabase client with realtime enabled
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  }
})

// Enable console logging for debugging
if (typeof window !== 'undefined') {
  console.log('Supabase client initialized with URL:', supabaseUrl)
}

export { supabase } 