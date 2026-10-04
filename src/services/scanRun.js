// src/services/scanRun.js
//
// One scan, start to finish: call AI → normalize → score → suggestions → save.
// Pages keep only UI state (loading / result / expand) and per-tool auto-expand rules.

import {
  callAI,
  callAIStream,
  extractScore,
  normalizeAuditResult,
  normalizeLoopholesResult,
} from "./scanService.js"
import { saveScan, attachEmbedding, embeddingText, authHeader } from "./supabaseService.js"
import { getSuggestions } from "../utils/crossToolSuggestions.js"

// Tools without an entry keep the validated AI shape as-is.
const NORMALIZERS = {
  audit: (content) => normalizeAuditResult(content),
  loopholes: (content) => normalizeLoopholesResult(content),
}

// Which payload field is the human-readable input stored in scan_history.
const INPUT_FIELD = {
  debugger: "code",
  audit: "files",
  loopholes: "systemDescription",
}

const EMBEDDED_TOOLS = new Set(["debugger"])

/**
 * @param {object} opts
 * @param {string} opts.tool
 * @param {object} opts.payload     - raw page input, same shape callAI takes
 * @param {object|null} opts.user   - signed-in user; no user means nothing is saved
 * @param {boolean} [opts.stream]   - stream tokens through onChunk
 * @param {(text: string) => void} [opts.onChunk]
 * @returns {Promise<{ result: object|null, score: number|null, suggestions: Array, error: string|null }>}
 */
export async function runScan({ tool, payload, user, stream = false, onChunk }) {
  const { content, error } = stream
    ? await callAIStream(tool, payload, onChunk)
    : await callAI(tool, payload)
  if (error) return { result: null, score: null, suggestions: [], error }

  const normalize = NORMALIZERS[tool]
  const result = normalize ? normalize(content, payload) : content
  const score = extractScore(tool, result)
  const suggestions = getSuggestions(tool, result)

  if (user) persistScan(user.id, tool, payload[INPUT_FIELD[tool]], result, score)

  return { result, score, suggestions, error: null }
}

// Fire-and-forget: a failed save must never break the scan the user is looking at.
async function persistScan(userId, tool, input, result, score) {
  const { data, error } = await saveScan(userId, tool, input, result, score)
  if (error) {
    console.error("[scanRun] Failed to save scan:", error.message)
    return
  }
  const scanId = data?.[0]?.id
  if (scanId && EMBEDDED_TOOLS.has(tool)) attachEmbedding(scanId, tool, result)
}

/**
 * Past scans of this user that look like `result`. Non-fatal: returns [] on any failure.
 */
export async function findSimilarScans(tool, result) {
  try {
    const auth = await authHeader()
    const genRes = await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ action: "generate", text: embeddingText(tool, result) }),
    })
    if (!genRes.ok) return []
    const { embedding } = await genRes.json()
    if (!embedding) return []

    const simRes = await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ action: "similar", embedding }),
    })
    if (!simRes.ok) return []
    const { similar } = await simRes.json()
    return similar ?? []
  } catch (err) {
    console.error("[scanRun] similar scans fetch failed (non-fatal):", err)
    return []
  }
}
