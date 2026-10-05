import { verifyUser } from "./_lib/auth.js"
import { withLog } from "./_lib/log.js"
import { checkRateLimit } from "./_lib/rateLimit.js"
import { validateGeminiBody } from "./_lib/validate.js"
import {
  configuredProviders,
  orderedProviders,
  generateWithFallback,
  FAST_OPTS,
  streamProvider,
  markCooldown,
  cooldownFor,
} from "./_lib/providers.js"

const RATE_LIMIT_MAX = 20 // raised from 10 — 4 providers pooled behind this now, not 1

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

  regulations: `You are a global AI regulation expert. Return ONLY valid JSON, no markdown, no backticks, no explanation. Only include regulations you are confident are real. If unsure, omit it. Return maximum 4 regulations. Each summary max 2 sentences. Checklist max 4 items. Checklist items must be actionable and testable (e.g. 'Add watermark to AI-generated media'), never generic advice like 'ensure compliance'.`,
}

export default withLog("gemini", async function handler(req, res, log) {
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
  log.setAction(req.body?.tool)
  const { user, supabase } = await log.time("auth", () => verifyUser(req))
  if (!user) return res.status(401).json({ error: "Sign in required" })
  log.setUser(user)

  // ── Rate limiting — per user, persisted in Postgres so it survives cold
  //    starts and can't be dodged by rotating IPs ──
  const limit = await checkRateLimit(supabase, { bucket: "gemini", max: RATE_LIMIT_MAX, log })
  if (!limit.ok) return res.status(limit.status).json({ error: limit.error })

  if (configuredProviders().length === 0) return res.status(500).json({ error: "Service unavailable" })

  // ── Parse and validate request body ──
  const body = validateGeminiBody(req.body)
  if (body.error) return res.status(400).json({ error: body.error })
  const { tool, userPrompt, stream } = body

  // ── System prompt selected server-side — never from the client ──
  const systemPrompt = SYSTEM_PROMPTS[tool]

  // ── Non-streaming ──
  if (!stream) {
    try {
      const { content, provider } = await generateWithFallback(
        systemPrompt,
        userPrompt,
        log,
        tool === "regulations" ? FAST_OPTS : undefined
      )
      return res.status(200).json({ content, provider })
    } catch (err) {
      log.error("providers_failed", err)
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
    const t0 = performance.now()
    try {
      await streamProvider(provider, systemPrompt, userPrompt, res, log)
      return
    } catch (err) {
      markCooldown(provider.name, cooldownFor(err.status))
      log.stage("provider", performance.now() - t0, { provider: provider.name, ok: false, status: err.status, attempt: i + 1 })
      log.error("stream_provider_failed", err)
      if (isLast) {
        if (!res.headersSent) return res.status(502).json({ error: "AI provider unavailable — try again shortly" })
        return res.end()
      }
      // not last — loop tries the next provider, nothing has been written yet
    }
  }
})
