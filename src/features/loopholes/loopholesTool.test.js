import { describe, it, expect } from "vitest"
import { loopholesTool, normalizeLoopholesResult } from "./loopholesTool.js"

describe("loopholesTool", () => {
  it("scores by riskScore", () => {
    expect(loopholesTool.score({ riskScore: 30 })).toBe(30)
  })

  it("suggests Audit above the risk threshold and Debugger on any grey area", () => {
    const tools = loopholesTool.suggest({
      riskScore: 75,
      greyAreas: [{ title: "Cross-border data transfer", description: "..." }],
    }).map(s => s.tool)
    expect(tools).toContain("audit")
    expect(tools).toContain("debugger")
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
