// AI Debugger: everything scanRun and scanService need to know about this tool.
// Pure, no fetch. The server owns the system prompt (api/gemini.js); this builds
// the user prompt and validates the shape that prompt asks for.

export const debuggerTool = {
  id: "debugger",
  // Field of the page payload stored as the readable input in scan_history.
  inputField: "code",
  // Past scans of this tool are embedded for similar-scan lookup.
  embedded: true,

  buildPrompt({ code, language = "JavaScript", context = "" }) {
    let prompt = `Analyze this ${language} code. Return max 8 issues as JSON.\n\n`
    if (context) prompt += `Context: ${context}\n\n`
    prompt += `Code:\n\`\`\`${language.toLowerCase()}\n${code}\n\`\`\``
    return prompt
  },

  validate(parsed) {
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
    return parsed
  },

  score: (result) => result.healthScore ?? null,

  suggest(result) {
    const suggestions = []
    const issues = result.issues || []

    // Check for vibe-code smells → suggest full Audit
    const vibeIssues = issues.filter((i) => i.category === "vibecode")
    if (vibeIssues.length >= 2) {
      suggestions.push({
        tool: "audit",
        path: "/audit",
        title: "Run Vibe-Code Audit",
        reason: `${vibeIssues.length} vibe-code patterns detected — run a full project audit to check if this is a codebase-wide problem.`,
        priority: "high",
      })
    }

    // Any issues → suggest Loopholes if not run recently
    if (issues.length > 0) {
      suggestions.push({
        tool: "loopholes",
        path: "/loopholes",
        title: "Check Legal Compliance",
        reason: "Code issues found — make sure your deployment countries don't have regulations that make these worse.",
        priority: "low",
      })
    }

    return suggestions
  },
}
