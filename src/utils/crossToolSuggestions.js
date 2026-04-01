// src/utils/crossToolSuggestions.js
//
// Cross-tool intelligence: analyzes scan results and suggests
// which tool the user should run next.
//
// This is a rules engine, not AI — it runs instantly with no API call.
// Each rule checks for specific patterns in scan results and returns
// a suggestion with a reason, priority, and link to the suggested tool.

/**
 * @param {string} tool - The tool that just completed ("debugger" | "audit" | "loopholes" | "deploy-check" | "stress-test")
 * @param {object} result - The parsed scan result object
 * @returns {Array<{ tool: string, path: string, icon: string, title: string, reason: string, priority: "high" | "medium" | "low" }>}
 */
export function getSuggestions(tool, result) {
  const suggestions = []

  switch (tool) {
    case "debugger":
      return getDebuggerSuggestions(result)
    case "audit":
      return getAuditSuggestions(result)
    case "loopholes":
      return getLoopholeSuggestions(result)
    case "deploy-check":
      return getDeployCheckSuggestions(result)
    case "stress-test":
      return getStressTestSuggestions(result)
    default:
      return []
  }
}

function getDebuggerSuggestions(result) {
  const suggestions = []
  const issues = result.issues || []
  const score = result.healthScore ?? 100

  // Check for security issues → suggest Deploy Check
  const securityIssues = issues.filter((i) => i.category === "security")
  if (securityIssues.length > 0) {
    suggestions.push({
      tool: "deploy-check",
      path: "/deploy-check",
      title: "Run Deploy Checker",
      reason: `Found ${securityIssues.length} security issue${securityIssues.length > 1 ? "s" : ""} — validate your deployment config isn't exposing these in production.`,
      priority: "high",
    })
  }

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

  // Low health score → suggest Stress Test
  if (score < 40) {
    suggestions.push({
      tool: "stress-test",
      path: "/stress-test",
      title: "Run Stress Test",
      reason: `Health score is ${score}/100 — check how this code handles real traffic before deploying.`,
      priority: "medium",
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
  const issues = result.issues || result.actionItems || []

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

  // Low deploy readiness → suggest Deploy Check
  const deployScore = scores.deployReady?.score ?? scores.deployReadiness?.score ?? scores.deployReady ?? 100
  if (deployScore < 60) {
    suggestions.push({
      tool: "deploy-check",
      path: "/deploy-check",
      title: "Run Deploy Checker",
      reason: `Deploy readiness is ${deployScore}% — validate your env vars, CORS, and security headers before shipping.`,
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

  // Low overall → suggest Stress Test
  const overall = result.overallScore ?? 100
  if (overall < 50) {
    suggestions.push({
      tool: "stress-test",
      path: "/stress-test",
      title: "Run Stress Test",
      reason: `Overall score ${overall}/100 — see where your architecture breaks under load before users find out.`,
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

  // Grey areas about data processing → suggest Deploy Check
  const dataAreas = greyAreas.filter(
    (g) =>
      (g.title || g.issue || "").toLowerCase().includes("data") ||
      (g.description || "").toLowerCase().includes("data")
  )
  if (dataAreas.length > 0) {
    suggestions.push({
      tool: "deploy-check",
      path: "/deploy-check",
      title: "Validate Data Handling Config",
      reason: `${dataAreas.length} grey area${dataAreas.length > 1 ? "s" : ""} involve data processing — check your deployment handles data localisation and encryption correctly.`,
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

function getDeployCheckSuggestions(result) {
  const suggestions = []
  const checks = result.checks || []
  const score = result.score ?? result.readinessScore ?? 100

  // Failed security checks → suggest Debugger
  const secFails = checks.filter(
    (c) => (c.status === "fail" || c.status === "warn") && (c.category === "security" || (c.name || c.title || "").toLowerCase().includes("security"))
  )
  if (secFails.length > 0) {
    suggestions.push({
      tool: "debugger",
      path: "/debugger",
      title: "Scan Code for Security Holes",
      reason: `${secFails.length} security check${secFails.length > 1 ? "s" : ""} failed — scan your source code to find the root causes.`,
      priority: "high",
    })
  }

  // No rate limiting → suggest Stress Test
  const noRateLimit = checks.find(
    (c) => c.status === "fail" && (c.name || c.title || "").toLowerCase().includes("rate limit")
  )
  if (noRateLimit) {
    suggestions.push({
      tool: "stress-test",
      path: "/stress-test",
      title: "Run Stress Test",
      reason: "No rate limiting detected — see exactly when your API breaks under load and how much it would cost.",
      priority: "high",
    })
  }

  // Low score → suggest Audit
  if (score < 60) {
    suggestions.push({
      tool: "audit",
      path: "/audit",
      title: "Full Project Audit",
      reason: `Deploy readiness is ${score}% — run a full audit to identify systemic issues across your codebase.`,
      priority: "medium",
    })
  }

  return suggestions
}

function getStressTestSuggestions(result) {
  const suggestions = []
  const tiers = result.tiers || []
  const weakPoints = result.weakPoints || []

  // Red tiers at low user counts → suggest Deploy Check
  const earlyBreak = tiers.find((t) => t.status === "red" && t.users <= 100)
  if (earlyBreak) {
    suggestions.push({
      tool: "deploy-check",
      path: "/deploy-check",
      title: "Fix Deploy Configuration",
      reason: `System breaks at just ${earlyBreak.users} users — your deployment config likely has missing connection pooling or rate limiting.`,
      priority: "high",
    })
  }

  // Database bottleneck → suggest Debugger for query optimization
  const dbWeak = weakPoints.find((w) =>
    (w.component || "").toLowerCase().includes("database") || (w.issue || "").toLowerCase().includes("database")
  )
  if (dbWeak) {
    suggestions.push({
      tool: "debugger",
      path: "/debugger",
      title: "Scan Database Queries",
      reason: "Database identified as bottleneck — scan your query code for N+1 problems, missing indexes, and unoptimized joins.",
      priority: "high",
    })
  }

  // Any red tiers → suggest Audit
  const redTiers = tiers.filter((t) => t.status === "red")
  if (redTiers.length >= 2) {
    suggestions.push({
      tool: "audit",
      path: "/audit",
      title: "Full Architecture Audit",
      reason: `${redTiers.length} load tiers hit breaking point — audit your project for structural scalability issues.`,
      priority: "medium",
    })
  }

  // Always suggest legal check after stress test
  suggestions.push({
    tool: "loopholes",
    path: "/loopholes",
    title: "Check Compliance Before Launch",
    reason: "You've validated performance — now check that your target markets don't have regulatory surprises.",
    priority: "low",
  })

  return suggestions
}
