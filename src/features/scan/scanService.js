// src/features/scan/scanService.js
//
// THE ONLY FILE THAT CALLS /api/gemini FOR THE SCAN TOOLS (regulationsService has its own query).
import { authHeader } from "../../shared/authHeader.js"
import { TOOL_MODULES } from "./toolModules.js"
//
// Every tool calls callAI(prompt, options) — one function, one place.
// If the proxy URL changes, the request format changes, or we swap AI
// providers entirely, this is the only file that needs to change.
//
// Returns a consistent shape:
//   { content: <parsed object>, error: <string | null> }
// — content is already parsed from JSON so callers never touch JSON.parse()

// ─────────────────────────────────────────────
// TOOLS
// Names only — client just needs to know which tool names are valid.
// The proxy (api/gemini.js) owns the actual system prompt text and
// selects it server-side based on the tool name; that text is never
// sent to or from the client.
// ─────────────────────────────────────────────

const TOOLS = new Set(["debugger", "audit", "loopholes", "regulations"])

// ─────────────────────────────────────────────
// PER-TOOL LOGIC
// Prompt text, response validation, scoring and normalizing live in each
// tool's own module (see toolModules.js). This file only dispatches to them.
// A tool without a module (regulations) gets its payload passed through as-is.
// ─────────────────────────────────────────────

function buildUserPrompt(tool, payload) {
  const mod = TOOL_MODULES[tool]
  return mod ? mod.buildPrompt(payload) : JSON.stringify(payload)
}

// Catch bad AI responses early, before they cause confusing UI errors downstream.
export function validate(tool, parsed) {
  const mod = TOOL_MODULES[tool]
  return mod ? mod.validate(parsed) : parsed
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
 * @param {string} tool     - One of: "debugger" | "audit" | "loopholes" | "regulations"
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
