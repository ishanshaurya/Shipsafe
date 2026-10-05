// Vibe-Code Audit: everything scanRun and scanService need to know about this tool.
// Pure, no fetch. The server owns the system prompt (api/gemini.js).

const AUDIT_CATEGORIES = ["security", "quality", "maintainability", "aiPatterns", "deployReady"]

// The AI returns a lean, validated shape; the page was built around a richer one
// (ids, flat issue list, verdict). This bridges the two.
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

export const auditTool = {
  id: "audit",
  inputField: "files",

  buildPrompt({ projectDescription, files = "" }) {
    let prompt = `Audit this project for vibe-code patterns and responsible engineering.\n\n`
    prompt += `Project description: ${projectDescription}\n\n`
    if (files) prompt += `Files / code:\n${files}`
    return prompt
  },

  validate(parsed) {
    if (typeof parsed.overallScore !== "number") throw new Error("Missing overallScore")
    if (!parsed.categories) throw new Error("Missing categories")
    if (!Array.isArray(parsed.actionItems)) parsed.actionItems = []
    if (!Array.isArray(parsed.vibeCodePatterns)) parsed.vibeCodePatterns = []
    return parsed
  },

  normalize: (content) => normalizeAuditResult(content),

  score: (result) => result.overallScore ?? null,

  suggest(result) {
    const suggestions = []
    const scores = result.scores || result.categories || {}

    // Low security score → suggest Debugger for deep dive
    const secScore = scores.security?.score ?? scores.security ?? 100
    if (secScore < 50) {
      suggestions.push({
        tool: "debugger",
        path: "/debugger",
        title: "Deep-Scan Critical Files",
        reason: `Security score is ${secScore}% — paste your most sensitive files (auth, API routes) into the Debugger for line-by-line analysis.`,
        priority: "high",
      })
    }

    // AI patterns detected → suggest Loopholes
    const aiScore = scores.aiPatterns?.score ?? scores.aiPatterns ?? 100
    if (aiScore < 50) {
      suggestions.push({
        tool: "loopholes",
        path: "/loopholes",
        title: "Check AI Regulation Compliance",
        reason: "Heavy AI-generated code patterns detected — check if AI regulations require transparency disclosures for your use case.",
        priority: "medium",
      })
    }

    return suggestions
  },
}
