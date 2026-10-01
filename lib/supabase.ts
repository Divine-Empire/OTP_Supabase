import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Memoized across requests within the same server process — every
// route.ts handler calls getSupabaseAdmin(), so without this a brand-new
// client (and its own internal fetch/auth setup) was being constructed on
// every single API request.
let cachedClient: SupabaseClient | null = null

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient

  const supabaseUrl = process.env.SUPABASE_URL
  // Service role first — this client is meant to run as a trusted backend
  // admin (writes across every otp_* table, RLS disabled), the anon key is
  // only a fallback for an environment that hasn't set the service key.
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY environment variables.")
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return cachedClient
}

export function getSupabaseClient() {
  return getSupabaseAdmin()
}

