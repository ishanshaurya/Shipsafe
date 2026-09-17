import { describe, it, expect } from "vitest"
import { getSuggestions } from "./crossToolSuggestions.js"

describe("getSuggestions", () => {
  it("returns [] for an unknown tool", () => {
    expect(getSuggestions("nonsense", {})).toEqual([])
  })

  it("debugger: suggests Deploy Checker on security issues and Audit on repeated vibe-code smells", () => {
    const result = getSuggestions("debugger", {
      healthScore: 100,
      issues: [
        { category: "security" },
        { category: "vibecode" },
        { category: "vibecode" },
      ],
    })
    const tools = result.map(s => s.tool)
    expect(tools).toContain("deploy-check")
    expect(tools).toContain("audit")
  })

  it("debugger: suggests Stress Test only below a health-score threshold", () => {
    const low = getSuggestions("debugger", { healthScore: 30, issues: [] })
    const high = getSuggestions("debugger", { healthScore: 90, issues: [] })
    expect(low.some(s => s.tool === "stress-test")).toBe(true)
    expect(high.some(s => s.tool === "stress-test")).toBe(false)
  })

  it("audit: accepts either the normalized 'scores' shape or the raw AI 'categories' shape", () => {
    const withScores = getSuggestions("audit", { overallScore: 100, scores: { security: 20, deployReady: 100, aiPatterns: 100 } })
    const withCategories = getSuggestions("audit", { overallScore: 100, categories: { security: { score: 20 }, deployReadiness: { score: 100 }, aiPatterns: { score: 100 } } })
    expect(withScores.some(s => s.tool === "debugger")).toBe(true)
    expect(withCategories.some(s => s.tool === "debugger")).toBe(true)
  })

  it("loopholes: suggests Audit above the risk threshold and Deploy Check when a grey area mentions data", () => {
    const result = getSuggestions("loopholes", {
      riskScore: 75,
      greyAreas: [{ title: "Cross-border data transfer", description: "..." }],
    })
    const tools = result.map(s => s.tool)
    expect(tools).toContain("audit")
    expect(tools).toContain("deploy-check")
    expect(tools).toContain("debugger")
  })

  it("deploy-check: suggests Debugger on failed security checks and Stress Test on missing rate limiting", () => {
    const result = getSuggestions("deploy-check", {
      score: 100,
      checks: [
        { status: "fail", category: "security", name: "CORS" },
        { status: "fail", name: "No rate limiting" },
      ],
    })
    const tools = result.map(s => s.tool)
    expect(tools).toContain("debugger")
    expect(tools).toContain("stress-test")
  })

  it("stress-test: always suggests Loopholes, and Deploy Check on an early breaking point", () => {
    const result = getSuggestions("stress-test", {
      tiers: [{ users: 50, status: "red" }],
      weakPoints: [],
    })
    const tools = result.map(s => s.tool)
    expect(tools).toContain("loopholes")
    expect(tools).toContain("deploy-check")
  })
})
