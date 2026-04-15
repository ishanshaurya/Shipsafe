// NOTE: in-memory rate limiter resets on cold starts. Replace with Redis/Upstash for persistent limiting at scale.
const rateLimitStore = new Map()

const ALLOWED_TOOLS = new Set(["debugger", "audit", "loopholes", "deploy-check", "stress-test"])

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
    "security":        { "score": <0-100>, "label": "<Good|Needs Work|Critical>", "issues": ["<issue>"] },
    "codeQuality":     { "score": <0-100>, "label": "<Good|Needs Work|Critical>", "issues": ["<issue>"] },
    "maintainability": { "score": <0-100>, "label": "<Good|Needs Work|Critical>", "issues": ["<issue>"] },
    "testCoverage":    { "score": <0-100>, "label": "<Good|Needs Work|Critical>", "issues": ["<issue>"] },
    "deployReadiness": { "score": <0-100>, "label": "<Good|Needs Work|Critical>", "issues": ["<issue>"] }
  },
  "vibeCodePatterns": ["<detected AI-generated pattern>"],
  "actionItems": [
    { "priority": "high" | "medium" | "low", "item": "<concrete action>" }
  ]
}

Rules:
- Max 3 issues per category. Max 5 action items.
- vibeCodePatterns: look for everything-in-one-file, no types, console.log everywhere, no tests, copy-paste blocks, hallucinated imports.
- Respond ONLY with the JSON object.`,

  loopholes: `You are ShipSafe Legal Analyst — you find regulatory grey areas and legal ambiguities in AI regulations that developers should know about.

You MUST respond with ONLY valid JSON — no markdown, no backticks, no explanation outside the JSON.

Response format:
{
  "riskScore": <number 0-100, where 100 = maximum legal risk>,
  "summary": "<2 sentences>",
  "greyAreas": [
    {
      "id": <number>,
      "regulation": "<regulation name>",
      "country": "<country>",
      "issue": "<what is ambiguous>",
      "risk": "high" | "medium" | "low",
      "competitorExploit": "<what a less ethical competitor could do here>",
      "defensiveAction": "<what you should do proactively>"
    }
  ],
  "upcomingChanges": ["<regulation in draft/proposed stage that may close a gap>"],
  "recommendations": ["<concrete recommendation>"]
}

Rules:
- Max 6 grey areas. Max 3 upcoming changes. Max 4 recommendations.
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

  // ── Rate limiting — 10 requests per 60-second window per IP ──
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress || "unknown"
  const now = Date.now()
  const window = 60_000
  const limit = 10
  const record = rateLimitStore.get(ip) || { count: 0, start: now }
  if (now - record.start > window) {
    rateLimitStore.set(ip, { count: 1, start: now })
  } else if (record.count >= limit) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again in 60 seconds." })
  } else {
    record.count++
    rateLimitStore.set(ip, record)
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: "Service unavailable" })

  // ── Parse and validate request body ──
  const { tool, userPrompt, stream } = req.body

  if (!tool || !ALLOWED_TOOLS.has(tool)) {
    return res.status(400).json({ error: "Invalid tool" })
  }

  if (!userPrompt || typeof userPrompt !== "string") {
    return res.status(400).json({ error: "userPrompt is required" })
  }

  if (userPrompt.length > 40000) {
    return res.status(400).json({ error: "Input too large" })
  }

  // ── System prompt selected server-side — never from the client ──
  const systemPrompt = SYSTEM_PROMPTS[tool]

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
  })

  // ── Non-streaming ──
  if (!stream) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body })
      if (!response.ok) {
        const errText = await response.text().catch(() => "")
        console.error("Gemini error:", response.status, errText.slice(0, 300))
        return res.status(502).json({ error: `Gemini returned ${response.status}` })
      }
      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!content) return res.status(502).json({ error: "Gemini returned empty response" })
      return res.status(200).json({ content, provider: "gemini" })
    } catch (err) {
      console.error("Gemini request failed:", err)
      return res.status(502).json({ error: "Failed to reach Gemini API" })
    }
  }

  // ── Streaming ──
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`
    const geminiRes = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "")
      console.error("Gemini stream error:", geminiRes.status, errText.slice(0, 300))
      return res.status(502).json({ error: `Gemini returned ${geminiRes.status}` })
    }

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("X-Accel-Buffering", "no")

    const reader = geminiRes.body.getReader()
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
          const parsed = JSON.parse(jsonStr)
          const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text
          if (chunk) res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
        } catch {}
      }
    }

    res.write("data: [DONE]\n\n")
    res.end()
  } catch (err) {
    console.error("Gemini stream failed:", err)
    if (!res.headersSent) res.status(502).json({ error: "Streaming failed" })
    else res.end()
  }
}
