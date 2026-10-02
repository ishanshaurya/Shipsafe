// src/utils/crossToolSuggestions.js
//
// Cross-tool intelligence: analyzes scan results and suggests
// which tool the user should run next.
//
// This is a rules engine, not AI — it runs instantly with no API call.
// Each rule checks for specific patterns in scan results and returns
// a suggestion with a reason, priority, and link to the suggested tool.

/**
 * @param {string} tool - The tool that just completed ("debugger" | "audit" | "loopholes")
 * @param {object} result - The parsed scan result object
 * @returns {Array<{ tool: string, path: string, icon: string, title: string, reason: string, priority: "high" | "medium" | "low" }>}
 */
export function getSuggestions(tool, result) {
  switch (tool) {
    case "debugger":
      return getDebuggerSuggestions(result)
    case "audit":
      return getAuditSuggestions(result)
    case "loopholes":
      return getLoopholeSuggestions(result)
    default:
      return []
  }
}

function getDebuggerSuggestions(result) {
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
}

function getAuditSuggestions(result) {
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
}

function getLoopholeSuggestions(result) {
  const suggestions = []
  const risk = result.riskScore ?? 0
  const greyAreas = result.greyAreas || []

  // High risk → suggest Audit for compliance patterns
  if (risk > 60) {
    suggestions.push({
      tool: "audit",
      path: "/audit",
      title: "Audit Code for Compliance",
      reason: `Risk score is ${risk}/100 — audit your codebase for consent mechanisms, data handling, and transparency that regulators require.`,
      priority: "high",
    })
  }

  // Any findings → suggest Debugger for secrets/exposure
  if (greyAreas.length > 0) {
    suggestions.push({
      tool: "debugger",
      path: "/debugger",
      title: "Scan for Exposed Secrets",
      reason: "Regulatory grey areas found — make sure your code doesn't expose user data or API keys that would violate these regulations.",
      priority: "medium",
    })
  }

  return suggestions
}
