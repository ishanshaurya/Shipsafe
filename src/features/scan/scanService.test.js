import { describe, it, expect, vi } from "vitest"

// These tests only exercise pure validation/normalization logic — no real
// Supabase client needed, and importing scanService.js pulls one in (for
// the auth header it attaches to AI calls). Stub it so the suite doesn't
// depend on env vars being present (e.g. in CI, which has no .env.local).
vi.mock("../../shared/supabaseClient.js", () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}))

const {
  validate,
  extractScore,
  normalizeAuditResult,
  normalizeLoopholesResult,
} = await import("./scanService.js")

describe("validate", () => {
  it("accepts a well-formed debugger response and fills in missing stats", () => {
    const parsed = validate("debugger", {
      healthScore: 72,
      issues: [{ id: 1, severity: "high" }, { id: 2, severity: "low" }],
    })
    expect(parsed.stats).toEqual({ totalIssues: 2, critical: 0, high: 1, medium: 0, low: 1 })
    expect(parsed.positives).toEqual([])
  })

  it("throws when a required field is missing", () => {
    expect(() => validate("debugger", { issues: [] })).toThrow(/healthScore/)
    expect(() => validate("audit", { overallScore: 50 })).toThrow(/categories/)
    expect(() => validate("loopholes", { riskScore: 10 })).toThrow(/greyAreas/)
  })

  it("defaults optional arrays when the AI omits them", () => {
    const parsed = validate("loopholes", { riskScore: 40, greyAreas: [] })
    expect(parsed.recommendations).toEqual([])
    expect(parsed.upcomingChanges).toEqual([])
  })
})

describe("extractScore", () => {
  it("reads the right field per tool", () => {
    expect(extractScore("debugger", { healthScore: 80 })).toBe(80)
    expect(extractScore("audit", { overallScore: 55 })).toBe(55)
    expect(extractScore("loopholes", { riskScore: 30 })).toBe(30)
  })

  it("returns null for unknown tools", () => {
    expect(extractScore("nonsense", {})).toBeNull()
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

describe("normalizeLoopholesResult", () => {
  it("assigns ids and defaults missing arrays", () => {
    const result = normalizeLoopholesResult({
      riskScore: 63,
      summary: "High exposure.",
      greyAreas: [{ regulation: "EU AI Act", country: "EU", risk: "high", title: "High-risk classification", description: "Boundaries unclear.", exploitation: "x", recommendation: "y" }],
    })
    expect(result.greyAreas[0].id).toBe(1)
    expect(result.defenses).toEqual([])
    expect(result.upcoming).toEqual([])
  })

  it("clamps riskScore into 0-100", () => {
    expect(normalizeLoopholesResult({ riskScore: 150, greyAreas: [] }).riskScore).toBe(100)
    expect(normalizeLoopholesResult({ riskScore: -20, greyAreas: [] }).riskScore).toBe(0)
  })
})
