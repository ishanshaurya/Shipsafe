// src/services/scanService.js
//
// THE ONLY FILE IN THE APP THAT CALLS /api/gemini.
import { MOCK_REGULATIONS, mockRegulationResult } from "../data/mockResults.js"
import { supabase } from "../lib/supabase.js"
//
// Every tool calls callAI(prompt, options) — one function, one place.
// If the proxy URL changes, the request format changes, or we swap AI
// providers entirely, this is the only file that needs to change.
//
// Returns a consistent shape:
//   { content: <parsed object>, error: <string | null> }
// — content is already parsed from JSON so callers never touch JSON.parse()

// The API verifies this server-side (see api/gemini.js) — every AI call
// needs the caller's Supabase session attached, or it's rejected with 401.
async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}

// ─────────────────────────────────────────────
// TOOLS
// Names only — client just needs to know which tool names are valid.
// The proxy (api/gemini.js) owns the actual system prompt text and
// selects it server-side based on the tool name; that text is never
// sent to or from the client.
// ─────────────────────────────────────────────

const TOOLS = new Set(["debugger", "audit", "loopholes", "deploy-check", "stress-test", "regulations"])

// ─────────────────────────────────────────────
// USER PROMPT BUILDERS
// Each tool needs a different prompt structure.
// Keeping them here means the page just passes raw input.
// ─────────────────────────────────────────────

function buildUserPrompt(tool, payload) {
  switch (tool) {
    case "debugger": {
      const { code, language = "JavaScript", context = "" } = payload
      let prompt = `Analyze this ${language} code. Return max 8 issues as JSON.\n\n`
      if (context) prompt += `Context: ${context}\n\n`
      prompt += `Code:\n\`\`\`${language.toLowerCase()}\n${code}\n\`\`\``
      return prompt
    }

    case "audit": {
      const { projectDescription, files = "" } = payload
      let prompt = `Audit this project for vibe-code patterns and responsible engineering.\n\n`
      prompt += `Project description: ${projectDescription}\n\n`
      if (files) prompt += `Files / code:\n${files}`
      return prompt
    }

    case "loopholes": {
      const { systemDescription, countries = [], regulation = "" } = payload
      let prompt = `Find regulatory grey areas for this AI system.\n\n`
      prompt += `System: ${systemDescription}\n`
      if (countries.length) prompt += `Target countries: ${countries.join(", ")}\n`
      if (regulation) prompt += `Specific regulation to analyze: ${regulation}\n`
      return prompt
    }

    case "deploy-check": {
      const { setupDescription, platform = "" } = payload
      let prompt = `Check this deployment setup for production readiness.\n\n`
      if (platform) prompt += `Platform: ${platform}\n\n`
      prompt += `Setup:\n${setupDescription}`
      return prompt
    }

    case "stress-test": {
      const { stackDescription } = payload
      return `Predict bottlenecks and failure points for this architecture under load.\n\nStack:\n${stackDescription}`
    }

    default:
      return JSON.stringify(payload)
  }
}

// ─────────────────────────────────────────────
// RESPONSE VALIDATORS
// Each tool has required fields — catch bad AI responses early
// before they cause confusing UI errors downstream.
// ─────────────────────────────────────────────

export function validate(tool, parsed) {
  switch (tool) {
    case "debugger":
      if (typeof parsed.healthScore !== "number") throw new Error("Missing healthScore")
      if (!Array.isArray(parsed.issues)) throw new Error("Missing issues array")
      // Ensure stats exist — generate if AI skipped it
      if (!parsed.stats) {
        const issues = parsed.issues
        parsed.stats = {
          totalIssues: issues.length,
          critical: issues.filter(i => i.severity === "critical").length,
          high:     issues.filter(i => i.severity === "high").length,
          medium:   issues.filter(i => i.severity === "medium").length,
          low:      issues.filter(i => i.severity === "low").length,
        }
      }
      if (!Array.isArray(parsed.positives)) parsed.positives = []
      break

    case "audit":
      if (typeof parsed.overallScore !== "number") throw new Error("Missing overallScore")
      if (!parsed.categories) throw new Error("Missing categories")
      if (!Array.isArray(parsed.actionItems)) parsed.actionItems = []
      if (!Array.isArray(parsed.vibeCodePatterns)) parsed.vibeCodePatterns = []
      break

    case "loopholes":
      if (typeof parsed.riskScore !== "number") throw new Error("Missing riskScore")
      if (!Array.isArray(parsed.greyAreas)) throw new Error("Missing greyAreas array")
      if (!Array.isArray(parsed.recommendations)) parsed.recommendations = []
      if (!Array.isArray(parsed.upcomingChanges)) parsed.upcomingChanges = []
      break

    case "deploy-check":
      if (typeof parsed.readinessScore !== "number") throw new Error("Missing readinessScore")
      if (!Array.isArray(parsed.checks)) throw new Error("Missing checks array")
      if (!Array.isArray(parsed.criticalBlockers)) parsed.criticalBlockers = []
      if (!Array.isArray(parsed.platformNotes)) parsed.platformNotes = []
      break

    case "stress-test":
      if (!Array.isArray(parsed.tiers)) throw new Error("Missing tiers array")
      if (!Array.isArray(parsed.weakPoints)) parsed.weakPoints = []
      if (!Array.isArray(parsed.recommendations)) parsed.recommendations = []
      break
  }
  return parsed
}

// ─────────────────────────────────────────────
// SCORE EXTRACTOR
// Each tool stores a different field as the "score" in scan_history.
// This pulls the right one so supabaseService.saveScan() gets a number.
// ─────────────────────────────────────────────

export function extractScore(tool, parsed) {
  switch (tool) {
    case "debugger":    return parsed.healthScore    ?? null
    case "audit":       return parsed.overallScore   ?? null
    case "loopholes":   return parsed.riskScore      ?? null
    case "deploy-check":return parsed.readinessScore ?? null
    case "stress-test": return null  // no single score — tiers tell the story
    default:            return null
  }
}

/**
 * Streaming version of callAI.
 * Calls the proxy with stream:true and fires onChunk(partialText) as tokens arrive.
 * Resolves with the full parsed+validated result when done.
 *
 * @param {string} tool
 * @param {object} payload
 * @param {function} onChunk - called with raw accumulated text as it streams in
 * @returns {{ content: object|null, error: string|null }}
 */
export async function callAIStream(tool, payload, onChunk) {
  try {
    if (!TOOLS.has(tool)) return { content: null, error: `Unknown tool: "${tool}"` }

    const userPrompt = buildUserPrompt(tool, payload)

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ tool, userPrompt, stream: true }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      return { content: null, error: errData.error || `Server error: ${response.status}` }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ""
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
          const { chunk } = JSON.parse(jsonStr)
          if (chunk) {
            accumulated += chunk
            onChunk?.(accumulated)
          }
        } catch {}
      }
    }

    // Parse + validate same as callAI
    let raw = accumulated.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error("[scanService] Stream JSON parse failed:", raw.slice(0, 300))
      return { content: null, error: "AI returned an invalid response. Please try again." }
    }
    try {
      parsed = validate(tool, parsed)
    } catch (validationErr) {
      console.error("[scanService] Stream validation failed:", validationErr.message)
      return { content: null, error: "AI response was incomplete. Please try again." }
    }

    return { content: parsed, error: null }
  } catch (err) {
    console.error("[scanService] callAIStream threw:", err)
    return { content: null, error: err.message || "Unexpected error. Please try again." }
  }
}

// ─────────────────────────────────────────────
// callAI — THE ONE FUNCTION ALL TOOLS USE
// ─────────────────────────────────────────────

/**
 * Send a request to the AI via the /api/gemini proxy.
 *
 * The page passes raw user input (code, description, etc.) as `payload`.
 * This function handles everything else: building prompts, fetching,
 * parsing JSON, validating, and returning a clean result.
 *
 * @param {string} tool     - One of: "debugger" | "audit" | "loopholes" | "deploy-check" | "stress-test"
 * @param {object} payload  - Raw input from the page (varies by tool, see buildUserPrompt)
 *
 * @returns {{ content: object|null, error: string|null }}
 *
 * Usage in a page:
 *   const { content, error } = await callAI("debugger", { code, language, context })
 *   if (error) setError(error)
 *   else setResult(content)
 */
export async function callAI(tool, payload) {
  try {
    if (!TOOLS.has(tool)) {
      return { content: null, error: `Unknown tool: "${tool}"` }
    }

    const userPrompt = buildUserPrompt(tool, payload)

    // ── Fetch ──────────────────────────────────────────────
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ tool, userPrompt }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      const errMsg = typeof errData.error === "string"
        ? errData.error
        : `Server error: ${response.status}`
      return { content: null, error: errMsg }
    }

    const data = await response.json()

    // ── Parse ──────────────────────────────────────────────
    // Strip markdown fences in case Gemini wraps the JSON anyway
    let raw = data.content || ""
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error("[scanService] JSON parse failed:", raw.slice(0, 300))
      return { content: null, error: "AI returned an invalid response. Please try again." }
    }

    // ── Validate & normalize ────────────────────────────────
    try {
      parsed = validate(tool, parsed)
    } catch (validationErr) {
      console.error("[scanService] Validation failed:", validationErr.message)
      return { content: null, error: "AI response was incomplete. Please try again." }
    }

    return { content: parsed, error: null }

  } catch (err) {
    console.error("[scanService] callAI threw:", err)
    return { content: null, error: err.message || "Unexpected error. Please try again." }
  }
}

// ─────────────────────────────────────────────
// RESULT NORMALIZERS
// The AI returns a lean, validated shape (see the system prompts in api/gemini.js).
// Each tool's page was built around a richer shape (ids, verdicts,
// derived stats). These adapters bridge the two so the pages don't
// need to change — same pattern as normalizeRegulation() below.
// ─────────────────────────────────────────────

const AUDIT_CATEGORIES = ["security", "quality", "maintainability", "aiPatterns", "deployReady"]

export function normalizeAuditResult(parsed) {
  const scores = {}
  const issues = []
  let fid = 1
  for (const key of AUDIT_CATEGORIES) {
    const cat = parsed.categories?.[key] || {}
    scores[key] = typeof cat.score === "number" ? cat.score : 100
    ;(Array.isArray(cat.issues) ? cat.issues : []).forEach(i => {
      issues.push({
        id: fid++,
        category: key,
        severity: ["critical", "high", "medium", "low"].includes(i.severity) ? i.severity : "medium",
        title: i.title || "Issue",
        detail: i.detail || "",
        fix: i.fix || "",
      })
    })
  }
  const overallScore = typeof parsed.overallScore === "number"
    ? parsed.overallScore
    : Math.round(AUDIT_CATEGORIES.reduce((s, k) => s + scores[k], 0) / AUDIT_CATEGORIES.length)

  return {
    overallScore,
    scores,
    summary: parsed.summary || "",
    issues,
    verdict: overallScore >= 70 ? "SHIP-READY" : overallScore >= 40 ? "NEEDS WORK" : "NOT SAFE TO SHIP",
    verdictColor: overallScore >= 70 ? "#22c55e" : overallScore >= 40 ? "#f59e0b" : "#ef4444",
  }
}

export function normalizeDeployCheckResult(parsed, platform) {
  const checks = (Array.isArray(parsed.checks) ? parsed.checks : []).map((c, i) => ({
    id: c.id ?? i + 1,
    category: c.category || "general",
    status: ["pass", "warn", "fail", "info"].includes(c.status) ? c.status : "warn",
    title: c.name || c.title || "Check",
    description: c.detail || c.description || "",
    fix: c.fix || null,
  }))
  const passed = checks.filter(c => c.status === "pass").length
  const failed = checks.filter(c => c.status === "fail").length
  const warned = checks.filter(c => c.status === "warn").length
  const info = checks.filter(c => c.status === "info").length
  const score = typeof parsed.readinessScore === "number" ? parsed.readinessScore : 0

  return {
    score,
    readinessScore: score, // kept so extractScore("deploy-check", ...) still finds it
    platform,
    checks,
    summary: parsed.summary || "",
    verdict: score >= 80 ? "READY" : score >= 50 ? "ALMOST" : "NOT READY",
    verdictColor: score >= 80 ? "#34d399" : score >= 50 ? "#eab308" : "#ef4444",
    stats: { passed, failed, warned, info },
  }
}

export function normalizeLoopholesResult(parsed) {
  const greyAreas = (Array.isArray(parsed.greyAreas) ? parsed.greyAreas : []).map((g, i) => ({
    id: i + 1,
    regulation: g.regulation || "Unknown regulation",
    country: g.country || "Unknown",
    risk: ["high", "medium", "low"].includes(g.risk) ? g.risk : "medium",
    title: g.title || g.regulation || "Grey area",
    description: g.description || "",
    exploitation: g.exploitation || "",
    recommendation: g.recommendation || "",
  }))
  const riskScore = typeof parsed.riskScore === "number" ? Math.min(100, Math.max(0, parsed.riskScore)) : 50

  return {
    riskScore,
    summary: parsed.summary || "",
    greyAreas,
    defenses: Array.isArray(parsed.defenses) ? parsed.defenses : [],
    upcoming: Array.isArray(parsed.upcoming) ? parsed.upcoming : [],
  }
}

// ─────────────────────────────────────────────
// REGULATIONS FETCHER
// ─────────────────────────────────────────────

const _regulationsCache = new Map()

function isValidUrl(str) {
  try { new URL(str); return true } catch { return false }
}

function normalizeRegulation(r) {
  return {
    name: r.name || "Unknown Regulation",
    country: r.country || "Unknown",
    year: r.year || null,
    status: r.status || "Unknown",
    summary: r.summary || "No summary available",
    source_url: isValidUrl(r.source_url) ? r.source_url : null,
    sectors: Array.isArray(r.sectors) ? r.sectors : [],
    risk: {
      description: r.risk?.description || "Not specified",
      severity: ["High", "Medium", "Low"].includes(r.risk?.severity) ? r.risk.severity : "Medium",
      who_is_at_risk: Array.isArray(r.risk?.who_is_at_risk) ? r.risk.who_is_at_risk : [],
    },
    developer_checklist: Array.isArray(r.developer_checklist) ? r.developer_checklist : [],
  }
}

export async function fetchRegulations(topic) {
  const key = topic.toLowerCase().trim()
  if (_regulationsCache.has(key)) return _regulationsCache.get(key)

  const userPrompt = `Topic: ${topic}

Return JSON matching this exact shape:
{
  "topic": "${topic}",
  "regulations": [
    {
      "name": string,
      "country": string,
      "year": number | null,
      "status": "Active" | "Draft" | "Proposed" | "Repealed" | "Unknown",
      "summary": string,
      "source_url": string,
      "sectors": string[],
      "risk": {
        "description": string,
        "severity": "High" | "Medium" | "Low",
        "who_is_at_risk": string[]
      },
      "developer_checklist": string[]
    }
  ],
  "country_coverage": {
    "regulated": string[],
    "draft": string[],
    "unregulated": string[]
  },
  "overall_severity": "High" | "Medium" | "Low"
}`

  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ tool: "regulations", userPrompt }),
    })

    if (!response.ok) throw new Error(`Server error: ${response.status}`)

    const data = await response.json()
    let raw = (data.content || "").replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
    const parsed = JSON.parse(raw)

    const regsArray = Array.isArray(parsed) ? parsed : (parsed.regulations || [])
    const seen = new Map()
    regsArray.forEach(r => {
      const nameKey = (r.name || "").toLowerCase()
      if (nameKey && !seen.has(nameKey)) seen.set(nameKey, normalizeRegulation(r))
    })

    const result = {
      regulations: Array.from(seen.values()),
      country_coverage: parsed.country_coverage ?? null,
      overall_severity: parsed.overall_severity ?? null,
    }

    _regulationsCache.set(key, result)
    return result

  } catch (err) {
    console.error("[scanService] fetchRegulations failed:", err)
    return mockRegulationResult
  }
}
