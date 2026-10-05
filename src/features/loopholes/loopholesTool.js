// Loophole Finder: everything scanRun and scanService need to know about this tool.
// Pure, no fetch. The server owns the system prompt (api/gemini.js).

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

export const loopholesTool = {
  id: "loopholes",
  inputField: "systemDescription",

  buildPrompt({ systemDescription, countries = [], regulation = "" }) {
    let prompt = `Find regulatory grey areas for this AI system.\n\n`
    prompt += `System: ${systemDescription}\n`
    if (countries.length) prompt += `Target countries: ${countries.join(", ")}\n`
    if (regulation) prompt += `Specific regulation to analyze: ${regulation}\n`
    return prompt
  },

  validate(parsed) {
    if (typeof parsed.riskScore !== "number") throw new Error("Missing riskScore")
    if (!Array.isArray(parsed.greyAreas)) throw new Error("Missing greyAreas array")
    if (!Array.isArray(parsed.recommendations)) parsed.recommendations = []
    if (!Array.isArray(parsed.upcomingChanges)) parsed.upcomingChanges = []
    return parsed
  },

  normalize: (content) => normalizeLoopholesResult(content),

  score: (result) => result.riskScore ?? null,

  suggest(result) {
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
  },
}
