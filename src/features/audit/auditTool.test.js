import { describe, it, expect } from "vitest"
import { auditTool, normalizeAuditResult } from "./auditTool.js"

describe("auditTool", () => {
  it("scores by overallScore", () => {
    expect(auditTool.score({ overallScore: 55 })).toBe(55)
  })

  it("suggests from either the normalized 'scores' shape or the raw AI 'categories' shape", () => {
    const withScores = auditTool.suggest({ overallScore: 100, scores: { security: 20, deployReady: 100, aiPatterns: 100 } })
    const withCategories = auditTool.suggest({ overallScore: 100, categories: { security: { score: 20 }, deployReadiness: { score: 100 }, aiPatterns: { score: 100 } } })
    expect(withScores.some(s => s.tool === "debugger")).toBe(true)
    expect(withCategories.some(s => s.tool === "debugger")).toBe(true)
  })
})

describe("normalizeAuditResult", () => {
  it("flattens per-category issues into one array with derived ids", () => {
    const result = normalizeAuditResult({
      overallScore: 42,
      summary: "Rough around the edges.",
      categories: {
        security: { score: 30, issues: [{ title: "Wildcard CORS", severity: "high", detail: "cors() with no config.", fix: "Restrict origins." }] },
        aiPatterns: { score: 20, issues: [{ title: "No tests", severity: "critical", detail: "Zero test files.", fix: "Add vitest." }] },
      },
    })
    expect(result.overallScore).toBe(42)
    expect(result.scores.security).toBe(30)
    expect(result.scores.quality).toBe(100) // category the AI omitted defaults to 100, not 0
    expect(result.issues).toHaveLength(2)
    expect(result.issues[0]).toMatchObject({ id: 1, category: "security", severity: "high", title: "Wildcard CORS" })
  })

  it("derives verdict from overallScore thresholds", () => {
    expect(normalizeAuditResult({ overallScore: 85, categories: {} }).verdict).toBe("SHIP-READY")
    expect(normalizeAuditResult({ overallScore: 50, categories: {} }).verdict).toBe("NEEDS WORK")
    expect(normalizeAuditResult({ overallScore: 10, categories: {} }).verdict).toBe("NOT SAFE TO SHIP")
  })

  it("falls back to an average of category scores if overallScore is missing", () => {
    const result = normalizeAuditResult({
      categories: { security: { score: 0 }, quality: { score: 100 }, maintainability: { score: 100 }, aiPatterns: { score: 100 }, deployReady: { score: 100 } },
    })
    expect(result.overallScore).toBe(80)
  })
})
