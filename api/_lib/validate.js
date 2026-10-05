export const ALLOWED_TOOLS = new Set(["debugger", "audit", "loopholes", "regulations"])

// Real model context windows here are all well over 1M chars — this cap is
// just a sane upper bound on what a single review should ever need to see.
export const MAX_INPUT_CHARS = 300_000

export const EMBEDDING_DIMENSIONS = 768
export const MAX_TEXT_CHARS = 10_000
const MAX_SIMILAR = 10

export const isEmbedding = (v) =>
  Array.isArray(v) && v.length === EMBEDDING_DIMENSIONS && v.every((n) => typeof n === "number" && Number.isFinite(n))

export const clampSimilarLimit = (limit) => Math.min(Math.max(parseInt(limit, 10) || 5, 1), MAX_SIMILAR)

// Returns { tool, userPrompt, stream } or { error } (sent as a 400).
export function validateGeminiBody(body) {
  const { tool, userPrompt, stream } = body || {}

  if (!tool || !ALLOWED_TOOLS.has(tool)) return { error: "Invalid tool" }
  if (!userPrompt || typeof userPrompt !== "string") return { error: "userPrompt is required" }
  if (userPrompt.length > MAX_INPUT_CHARS) return { error: "Input too large" }

  return { tool, userPrompt, stream }
}

// GitHub owner/repo charset — anything else could rewrite the API path
const NAME_RE = /^[A-Za-z0-9._-]+$/
const isSafeName = (n) => NAME_RE.test(n) && n !== "." && n !== ".."

export function parseGitHubUrl(url) {
  // Normalise — strip protocol, trailing slashes, whitespace
  const cleaned = url.trim().replace(/^https?:\/\//, "").replace(/\/$/, "")

  // Must start with github.com
  if (!cleaned.startsWith("github.com/")) return null

  const parts = cleaned.replace("github.com/", "").split("/")

  // Need at least owner/repo
  if (parts.length < 2) return null

  const owner = parts[0]
  const repo = parts[1].replace(/\.git$/, "")
  if (!isSafeName(owner) || !isSafeName(repo)) return null

  // Default result
  const result = { owner, repo, branch: null, subdir: null, singleFile: null }

  // github.com/owner/repo/blob/branch/path/to/file.js → single file
  if (parts[2] === "blob" && parts.length >= 5) {
    result.branch = parts[3]
    result.singleFile = parts.slice(4).join("/")
    return result
  }

  // github.com/owner/repo/tree/branch/optional/subdir → branch + optional subdir
  if (parts[2] === "tree" && parts.length >= 4) {
    result.branch = parts[3]
    if (parts.length > 4) result.subdir = parts.slice(4).join("/")
    return result
  }

  // github.com/owner/repo/tree/branch (no subdir)
  if (parts[2] === "tree" && parts.length === 4) {
    result.branch = parts[3]
    return result
  }

  // Anything else (issues, pulls, etc.) — just use owner/repo
  return result
}
