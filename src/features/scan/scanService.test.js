import { describe, it, expect, vi } from "vitest"

// These tests only exercise pure validation/normalization logic — no real
// Supabase client needed, and importing scanService.js pulls one in (for
// the auth header it attaches to AI calls). Stub it so the suite doesn't
// depend on env vars being present (e.g. in CI, which has no .env.local).
vi.mock("../../shared/supabaseClient.js", () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}))

const { validate } = await import("./scanService.js")

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
