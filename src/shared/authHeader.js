import { supabase } from "./supabaseClient"

// Session bearer token for our own /api/* endpoints, which all verify it server-side.
export async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}
