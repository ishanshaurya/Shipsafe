import { createClient } from "@supabase/supabase-js"

// Verifies the caller's Supabase session and returns a client scoped to their
// JWT (so RLS + auth.uid() resolve to them, not a service role).
export async function verifyUser(req) {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return { user: null, supabase: null }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return { user: null, supabase: null }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { user: null, supabase: null }
  return { user, supabase }
}
