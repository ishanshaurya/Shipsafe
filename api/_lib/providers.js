const EMBEDDING_MODEL = "text-embedding-004"

// ── Provider pool ────────────────────────────────────────────────────
// Every provider exposes an OpenAI-compatible /chat/completions endpoint
// except Gemini, which gets its own caller. Requests round-robin across
// whichever providers are configured (have an env key) and not currently
// in cooldown, then fall through to the next on failure — so one
// provider's rate limit doesn't fail the request, it just shifts load.
//
// Cooldown state is in-memory (per warm serverless instance) — good
// enough to stop hammering a limited/misconfigured key within a burst,
// resets on cold start.
const PROVIDERS = [
  { name: "gemini", envKey: "GEMINI_API_KEY" },
  { name: "groq", envKey: "GROQ_API_KEY", baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  { name: "cerebras", envKey: "CEREBRAS_API_KEY", baseUrl: "https://api.cerebras.ai/v1", model: "gpt-oss-120b" },
  { name: "sambanova", envKey: "SAMBANOVA_API_KEY", baseUrl: "https://api.sambanova.ai/v1", model: "Meta-Llama-3.3-70B-Instruct" },
]

const cooldowns = new Map() // provider name -> timestamp (ms) until which to skip it
let rotor = 0

export function configuredProviders() {
  return PROVIDERS.filter((p) => !!process.env[p.envKey])
}

function availableProviders() {
  const now = Date.now()
  return configuredProviders().filter((p) => (cooldowns.get(p.name) || 0) < now)
}

export function markCooldown(name, ms) {
  cooldowns.set(name, Date.now() + ms)
}

// Cooldown length depends on why the provider failed: a rate limit clears
// fast, a bad/missing key or bad request won't fix itself soon.
export function cooldownFor(status) {
  if (status === 429) return 60_000
  if (status >= 500) return 15_000
  return 10 * 60_000 // 401/403/400 — likely a config problem, back off longer
}

// Rotates the starting provider each call so load spreads across the pool
// instead of always hitting the same one first.
// Latency-sensitive factual lookups (regulations): fast hosts first, no Gemini
// "thinking", and a per-attempt timeout so a slow or hung provider fails over.
export const FAST_OPTS = { fastFirst: true, timeoutMs: 8_000, noThinking: true }
const FAST_ORDER = ["cerebras", "groq", "sambanova", "gemini"]

export function orderedProviders(opts = {}) {
  const avail = availableProviders()
  if (avail.length === 0) return []
  if (opts.fastFirst) return avail.sort((a, b) => FAST_ORDER.indexOf(a.name) - FAST_ORDER.indexOf(b.name))
  const start = rotor % avail.length
  rotor++
  return [...avail.slice(start), ...avail.slice(0, start)]
}

// ── Non-streaming callers ───────────────────────────────────────────
// Each throws { status, message } on failure so the pool can decide the
// right cooldown and move to the next provider.

async function callGemini(systemPrompt, userPrompt, apiKey, opts = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      ...(opts.noThinking && { thinkingConfig: { thinkingBudget: 0 } }),
    },
  })
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, ...signalFor(opts) })
  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    throw { status: response.status, message: `Gemini returned ${response.status}: ${errText.slice(0, 200)}` }
  }
  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) throw { status: 502, message: "Gemini returned empty response" }
  return content
}

async function callOpenAICompatible(provider, systemPrompt, userPrompt, apiKey, opts = {}) {
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.1,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    ...signalFor(opts),
  })
  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    throw { status: response.status, message: `${provider.name} returned ${response.status}: ${errText.slice(0, 200)}` }
  }
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw { status: 502, message: `${provider.name} returned empty response` }
  return content
}

const signalFor = (opts) => (opts.timeoutMs ? { signal: AbortSignal.timeout(opts.timeoutMs) } : {})

async function callProvider(provider, systemPrompt, userPrompt, opts) {
  const apiKey = process.env[provider.envKey]
  if (provider.name === "gemini") return callGemini(systemPrompt, userPrompt, apiKey, opts)
  return callOpenAICompatible(provider, systemPrompt, userPrompt, apiKey, opts)
}

// Tries providers in rotation order, falling through on failure. Only
// throws once every configured provider has failed or is cooling down.
export async function generateWithFallback(systemPrompt, userPrompt, log, opts = {}) {
  const order = orderedProviders(opts)
  if (order.length === 0) throw { status: 503, message: "All providers are unavailable or unconfigured" }

  let lastErr
  for (const [i, provider] of order.entries()) {
    const t0 = performance.now()
    try {
      const content = await callProvider(provider, systemPrompt, userPrompt, opts)
      log?.stage("provider", performance.now() - t0, { provider: provider.name, ok: true, attempt: i + 1 })
      return { content, provider: provider.name }
    } catch (caught) {
      // A timeout has no HTTP status; treat it as a transient 504 (short cooldown).
      const err = caught?.name === "TimeoutError" ? { status: 504, message: `${provider.name} timed out` } : caught
      lastErr = err
      markCooldown(provider.name, cooldownFor(err.status))
      log?.stage("provider", performance.now() - t0, { provider: provider.name, ok: false, status: err.status, attempt: i + 1 })
    }
  }
  throw lastErr
}

export async function streamProvider(provider, systemPrompt, userPrompt, res, log) {
  const t0 = performance.now()
  const apiKey = process.env[provider.envKey]

  const upstream =
    provider.name === "gemini"
      ? await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ parts: [{ text: userPrompt }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
            }),
          }
        )
      : await fetch(`${provider.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: provider.model,
            temperature: 0.1,
            max_tokens: 8192,
            stream: true,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        })

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "")
    throw { status: upstream.status, message: `${provider.name} returned ${upstream.status}: ${errText.slice(0, 200)}` }
  }

  const ttfbMs = performance.now() - t0
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("X-Accel-Buffering", "no")

  const extractChunk =
    provider.name === "gemini"
      ? (parsed) => parsed.candidates?.[0]?.content?.parts?.[0]?.text
      : (parsed) => parsed.choices?.[0]?.delta?.content

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const jsonStr = line.slice(6).trim()
      if (!jsonStr || jsonStr === "[DONE]") continue
      try {
        const chunk = extractChunk(JSON.parse(jsonStr))
        if (chunk) res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
      } catch {}
    }
  }

  res.write("data: [DONE]\n\n")
  res.end()
  log?.stage("provider", performance.now() - t0, { provider: provider.name, ok: true, ttfbMs })
}

export async function generateEmbedding(text, apiKey) {
  // Truncate to ~2000 chars to stay within embedding model limits
  const truncated = text.slice(0, 2000)

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text: truncated }] },
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    throw new Error(`Gemini embedding returned ${response.status}: ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  const values = data.embedding?.values

  if (!values || !Array.isArray(values)) {
    throw new Error("Gemini returned no embedding values")
  }

  return values
}
