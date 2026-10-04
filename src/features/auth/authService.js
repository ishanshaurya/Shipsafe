// The only module that calls Supabase Auth. Pages and the provider go through here.
// Credential calls return Supabase's { error } shape so Login keeps its existing error handling.

import { supabase } from "../../shared/supabaseClient"

export const signUp = (email, password) => supabase.auth.signUp({ email, password })

export const signInWithPassword = (email, password) => supabase.auth.signInWithPassword({ email, password })

export const signInWithGitHub = () =>
  supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: window.location.origin + "/dashboard" },
  })

export const signOut = () => supabase.auth.signOut()

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

// Calls onUser(user | null) on every sign-in or sign-out. Returns the unsubscribe function.
export function onAuthChange(onUser) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    onUser(session?.user ?? null)
  })
  return () => subscription.unsubscribe()
}
