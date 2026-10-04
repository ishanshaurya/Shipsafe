import { createClient } from '@supabase/supabase-js'

// These come from your .env.local file
// VITE_ prefix is required — Vite only exposes env vars that start with VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// This is the same createClient pattern you used in my-reg-tracker
// but now with Vite's env variable system instead of CRA's
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
