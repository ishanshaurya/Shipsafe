import { describe, it, expect } from "vitest"
import { getSuggestions } from "./crossToolSuggestions.js"

describe("getSuggestions", () => {
  it("returns [] for an unknown tool", () => {
    expect(getSuggestions("nonsense", {})).toEqual([])
  })

  it("debugger: suggests Audit on repeated vibe-code smells", () => {
    const result = getSuggestions("debugger", {
      healthScore: 100,
      issues: [
        { category: "security" },
        { category: "vibecode" },
        { category: "vibecode" },
      ],
    })
    const tools = result.map(s => s.tool)
    expect(tools).toContain("audit")
  })

  it("audit: accepts either the normalized 'scores' shape or the raw AI 'categories' shape", () => {
    const withScores = getSuggestions("audit", { overallScore: 100, scores: { security: 20, deployReady: 100, aiPatterns: 100 } })
    const withCategories = getSuggestions("audit", { overallScore: 100, categories: { security: { score: 20 }, deployReadiness: { score: 100 }, aiPatterns: { score: 100 } } })
    expect(withScores.some(s => s.tool === "debugger")).toBe(true)
    expect(withCategories.some(s => s.tool === "debugger")).toBe(true)
  })

  it("loopholes: suggests Audit above the risk threshold and Debugger on any grey area", () => {
    const result = getSuggestions("loopholes", {
      riskScore: 75,
      greyAreas: [{ title: "Cross-border data transfer", description: "..." }],
    })
    const tools = result.map(s => s.tool)
    expect(tools).toContain("audit")
    expect(tools).toContain("debugger")
  })
})
