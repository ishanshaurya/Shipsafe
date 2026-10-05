const WINDOW_MS = 60_000

// Persistent per-user fixed-window limit via the increment_rate_limit RPC.
// Each endpoint counts in its own bucket.
// Returns { ok: true } or { ok: false, status, error } ready to send.
export async function checkRateLimit(supabase, { bucket, max, windowMs = WINDOW_MS, errorStatus = 500 }) {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString()
  const { data: requestCount, error } = await supabase.rpc("increment_rate_limit", {
    p_window_start: windowStart,
    p_bucket: bucket,
  })
  if (error) {
    console.error("Rate limit check failed:", error)
    return { ok: false, status: errorStatus, error: "Rate limit check failed" }
  }
  if (requestCount > max) {
    return { ok: false, status: 429, error: "Rate limit exceeded. Try again in 60 seconds." }
  }
  return { ok: true }
}
