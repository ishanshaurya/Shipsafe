import { createClient } from "@supabase/supabase-js"

const ALLOWED_TOOLS = new Set(["debugger", "audit", "loopholes", "deploy-check", "stress-test", "regulations"])

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20 // raised from 10 — 4 providers pooled behind this now, not 1

// Real model context windows here are all well over 1M chars — this cap is
// just a sane upper bound on what a single review should ever need to see.
const MAX_INPUT_CHARS = 300_000

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

function configuredProviders() {
  return PROVIDERS.filter((p) => !!process.env[p.envKey])
}

function availableProviders() {
  const now = Date.now()
  return configuredProviders().filter((p) => (cooldowns.get(p.name) || 0) < now)
}

function markCooldown(name, ms) {
  cooldowns.set(name, Date.now() + ms)
}

// Cooldown length depends on why the provider failed: a rate limit clears
// fast, a bad/missing key or bad request won't fix itself soon.
function cooldownFor(status) {
  if (status === 429) return 60_000
  if (status >= 500) return 15_000
  return 10 * 60_000 // 401/403/400 — likely a config problem, back off longer
}

// Rotates the starting provider each call so load spreads across the pool
// instead of always hitting the same one first.
function orderedProviders() {
  const avail = availableProviders()
  if (avail.length === 0) return []
  const start = rotor % avail.length
  rotor++
  return [...avail.slice(start), ...avail.slice(0, start)]
}

// ── Verify the caller's Supabase session and return a client scoped to
//    their JWT (so RLS + auth.uid() resolve to them, not a service role) ──
async function verifyUser(req) {
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

const SYSTEM_PROMPTS = {
  debugger: `You are ShipSafe AI Debugger — an expert code reviewer that finds bugs, security vulnerabilities, and "vibe-code" smells.

You MUST respond with ONLY valid JSON — no markdown, no backticks, no explanation outside the JSON.

CRITICAL: Keep your response concise. Maximum 8 issues. Combine similar issues into one.

Response format:
{
  "healthScore": <number 0-100>,
  "summary": "<one sentence>",
  "stats": { "totalIssues": <n>, "critical": <n>, "high": <n>, "medium": <n>, "low": <n> },
  "issues": [
    {
      "id": <number>,
      "line": <number or null>,
      "severity": "critical" | "high" | "medium" | "low",
      "category": "security" | "bug" | "vibecode" | "style",
      "title": "<short title>",
      "description": "<1 sentence>",
      "codeSnippet": "<short problematic code or null>",
      "fix": "<short fix>"
    }
  ],
  "positives": ["<short positive>"]
}

CREDENTIAL SCAN: Also check for hardcoded secrets — API keys, tokens, passwords, private keys, connection strings. Flag these as severity 'critical', category 'security', with title starting with 'Hardcoded credential:'. High-entropy strings (random 20+ char alphanumeric) should also be flagged even if purpose is unclear.

Rules:
- MAX 8 issues. Prioritize the most important ones.
- Keep descriptions to 1 sentence. Keep fixes short.
- "vibecode" = AI-generated code smells: no error handling, hardcoded values, console.log everywhere, unused vars.
- healthScore: 90-100 excellent, 70-89 good, 40-69 needs work, 0-39 critical.
- Respond ONLY with the JSON object.`,

  audit: `You are ShipSafe Vibe-Code Auditor — you evaluate whether a project was responsibly built or hastily AI-generated.

You MUST respond with ONLY valid JSON — no markdown, no backticks, no explanation outside the JSON.

Response format:
{
  "overallScore": <number 0-100>,
  "summary": "<2 sentences>",
  "categories": {
    "security":        { "score": <0-100>, "issues": [ { "title": "<short title>", "severity": "critical"|"high"|"medium"|"low", "detail": "<1 sentence>", "fix": "<short fix>" } ] },
    "quality":         { "score": <0-100>, "issues": [ ...same issue shape... ] },
    "maintainability": { "score": <0-100>, "issues": [ ...same issue shape... ] },
    "aiPatterns":      { "score": <0-100>, "issues": [ ...same issue shape... ] },
    "deployReady":     { "score": <0-100>, "issues": [ ...same issue shape... ] }
  }
}

Category guidance:
- security: auth, secrets, input validation, XSS/CSRF protection
- quality: error handling, separation of concerns, DRY principles
- maintainability: file structure, naming, documentation, modularity
- aiPatterns: hallucinated imports, copy-paste blocks, missing tests, other AI-generated code smells
- deployReady: env vars, error boundaries, build config, monitoring

Rules:
- Max 3 issues per category.
- Keep each issue's "detail" to 1 sentence and "fix" short and concrete.
- Respond ONLY with the JSON object.`,

  loopholes: `You are ShipSafe Legal Analyst — you find regulatory grey areas and legal ambiguities in AI regulations that developers should know about.

You MUST respond with ONLY valid JSON — no markdown, no backticks, no explanation outside the JSON.

Response format:
{
  "riskScore": <number 0-100, where 100 = maximum legal risk>,
  "summary": "<2 sentences>",
  "greyAreas": [
    {
      "regulation": "<regulation name>",
      "country": "<country, with flag emoji if natural>",
      "risk": "high" | "medium" | "low",
      "title": "<short headline, max 8 words>",
      "description": "<what is ambiguous, 1-2 sentences>",
      "exploitation": "<what a less ethical competitor could do here>",
      "recommendation": "<what you should do proactively>"
    }
  ],
  "upcoming": [
    { "regulation": "<name>", "status": "Draft"|"Proposed"|"In Progress", "expected": "<year or range>", "impact": "<1 sentence>" }
  ],
  "defenses": ["<concrete proactive action>"]
}

Rules:
- Max 6 grey areas. Max 3 upcoming. Max 4 defenses.
- Be specific about which regulation and which clause is ambiguous.
- riskScore: 0-30 low, 31-60 moderate, 61-100 high.
- Respond ONLY with the JSON object.`,

  "deploy-check": `You are ShipSafe Deploy Checker — you validate deployment configurations and catch production gotchas before they cause outages.

You MUST respond with ONLY valid JSON — no markdown, no backticks, no explanation outside the JSON.

Response format:
{
  "readinessScore": <number 0-100>,
  "summary": "<2 sentences>",
  "checks": [
    {
      "id": <number>,
      "category": "env" | "security" | "performance" | "monitoring" | "database" | "cors",
      "name": "<check name>",
      "status": "pass" | "warn" | "fail",
      "detail": "<what was found>",
      "fix": "<what to do>"
    }
  ],
  "platformNotes": ["<platform-specific advice>"],
  "criticalBlockers": ["<must fix before shipping>"]
}

Rules:
- Max 10 checks. Flag both missing things AND misconfigurations.
- criticalBlockers: only items that WILL cause production failures.
- readinessScore: 90-100 ship it, 70-89 minor fixes, 40-69 needs work, 0-39 not ready.
- Respond ONLY with the JSON object.`,

  regulations: `You are a global AI regulation expert. Return ONLY valid JSON, no markdown, no backticks, no explanation. Only include regulations you are confident are real. If unsure, omit it. Return maximum 4 regulations. Each summary max 2 sentences. Checklist max 4 items. Checklist items must be actionable and testable (e.g. 'Add watermark to AI-generated media'), never generic advice like 'ensure compliance'.`,

  "stress-test": `You are ShipSafe Stress Tester — you predict bottlenecks and failure points in a described architecture under load.

You MUST respond with ONLY valid JSON — no markdown, no backticks, no explanation outside the JSON.

Response format:
{
  "summary": "<2 sentences>",
  "tiers": [
    {
      "users": <number>,
      "label": "<e.g. '10 concurrent users'>",
      "status": "green" | "yellow" | "red",
      "responseTime": "<estimated p95 response time>",
      "bottleneck": "<which component breaks first or null>",
      "notes": "<what happens at this tier>"
    }
  ],
  "weakPoints": [
    { "component": "<name>", "issue": "<what breaks>", "fix": "<how to fix>" }
  ],
  "safeCapacity": "<estimated safe concurrent user count>",
  "recommendations": ["<scaling recommendation>"]
}

Rules:
- Always include tiers for 10, 100, 1000, and 10000 users.
- weakPoints: max 5. recommendations: max 4.
- Be honest that this is AI-predicted, not real load testing.
- Respond ONLY with the JSON object.`,
}

// ── Non-streaming callers ───────────────────────────────────────────
// Each throws { status, message } on failure so the pool can decide the
// right cooldown and move to the next provider.

async function callGemini(systemPrompt, userPrompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
  })
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body })
  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    throw { status: response.status, message: `Gemini returned ${response.status}: ${errText.slice(0, 200)}` }
  }
  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) throw { status: 502, message: "Gemini returned empty response" }
  return content
}

async function callOpenAICompatible(provider, systemPrompt, userPrompt, apiKey) {
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

async function callProvider(provider, systemPrompt, userPrompt) {
  const apiKey = process.env[provider.envKey]
  if (provider.name === "gemini") return callGemini(systemPrompt, userPrompt, apiKey)
  return callOpenAICompatible(provider, systemPrompt, userPrompt, apiKey)
}

// Tries providers in rotation order, falling through on failure. Only
// throws once every configured provider has failed or is cooling down.
async function generateWithFallback(systemPrompt, userPrompt) {
  const order = orderedProviders()
  if (order.length === 0) throw { status: 503, message: "All providers are unavailable or unconfigured" }

  let lastErr
  for (const provider of order) {
    try {
      const content = await callProvider(provider, systemPrompt, userPrompt)
      return { content, provider: provider.name }
    } catch (err) {
      lastErr = err
      markCooldown(provider.name, cooldownFor(err.status))
      console.error(`[gemini] provider "${provider.name}" failed:`, err.status, err.message)
    }
  }
  throw lastErr
}

export default async function handler(req, res) {
  // ── CORS — locked to production origin only ──
  res.setHeader("Access-Control-Allow-Origin", "https://shipsafe-app.vercel.app")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "https://shipsafe-app.vercel.app")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    return res.status(200).end()
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  // ── Auth — login was previously enforced only client-side (React
  //    router), so this endpoint was reachable by anyone with the URL.
  //    Require and verify a Supabase session before doing anything else. ──
  const { user, supabase } = await verifyUser(req)
  if (!user) return res.status(401).json({ error: "Sign in required" })

  // ── Rate limiting — 10 requests per 60-second window, per user,
  //    persisted in Postgres so it survives cold starts and can't be
  //    dodged by rotating IPs ──
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString()
  const { data: requestCount, error: rateLimitError } = await supabase.rpc("increment_rate_limit", {
    p_window_start: windowStart,
  })
  if (rateLimitError) {
    console.error("Rate limit check failed:", rateLimitError)
    return res.status(500).json({ error: "Rate limit check failed" })
  }
  if (requestCount > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again in 60 seconds." })
  }

  if (configuredProviders().length === 0) return res.status(500).json({ error: "Service unavailable" })

  // ── Parse and validate request body ──
  const { tool, userPrompt, stream } = req.body

  if (!tool || !ALLOWED_TOOLS.has(tool)) {
    return res.status(400).json({ error: "Invalid tool" })
  }

  if (!userPrompt || typeof userPrompt !== "string") {
    return res.status(400).json({ error: "userPrompt is required" })
  }

  if (userPrompt.length > MAX_INPUT_CHARS) {
    return res.status(400).json({ error: "Input too large" })
  }

  // ── System prompt selected server-side — never from the client ──
  const systemPrompt = SYSTEM_PROMPTS[tool]

  // ── Non-streaming ──
  if (!stream) {
    try {
      const { content, provider } = await generateWithFallback(systemPrompt, userPrompt)
      return res.status(200).json({ content, provider })
    } catch (err) {
      console.error("All providers failed:", err.status, err.message)
      return res.status(502).json({ error: "AI provider unavailable — try again shortly" })
    }
  }

  // ── Streaming ──
  // Only the provider actually picked can stream, so it fails fast into the
  // next one in rotation before any bytes reach the client — after that,
  // switching providers mid-stream isn't possible.
  const order = orderedProviders()
  if (order.length === 0) return res.status(503).json({ error: "All providers are unavailable or unconfigured" })

  for (let i = 0; i < order.length; i++) {
    const provider = order[i]
    const isLast = i === order.length - 1
    try {
      await streamProvider(provider, systemPrompt, userPrompt, res)
      return
    } catch (err) {
      markCooldown(provider.name, cooldownFor(err.status))
      console.error(`[gemini] stream provider "${provider.name}" failed:`, err.status, err.message)
      if (isLast) {
        if (!res.headersSent) return res.status(502).json({ error: "AI provider unavailable — try again shortly" })
        return res.end()
      }
      // not last — loop tries the next provider, nothing has been written yet
    }
  }
}

async function streamProvider(provider, systemPrompt, userPrompt, res) {
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
}
