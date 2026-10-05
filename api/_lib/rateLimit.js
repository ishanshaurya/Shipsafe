const WINDOW_MS = 60_000

// Persistent per-user fixed-window limit via the increment_rate_limit RPC.
// Returns { ok: true } or { ok: false, status, error } ready to send.
export async function checkRateLimit(supabase, { max, windowMs = WINDOW_MS }) {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString()
  const { data: requestCount, error } = await supabase.rpc("increment_rate_limit", {
    p_window_start: windowStart,
  })
  if (error) {
    console.error("Rate limit check failed:", error)
    return { ok: false, status: 500, error: "Rate limit check failed" }
  }
  if (requestCount > max) {
    return { ok: false, status: 429, error: "Rate limit exceeded. Try again in 60 seconds." }
  }
  return { ok: true }
}
