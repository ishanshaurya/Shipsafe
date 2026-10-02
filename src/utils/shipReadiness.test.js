import { describe, it, expect } from "vitest"
import { computeShipReadiness, toolLabel } from "./shipReadiness.js"

describe("computeShipReadiness", () => {
  it("returns NO DATA for an empty or unscored scan list", () => {
    expect(computeShipReadiness([]).verdict).toBe("NO DATA")
    expect(computeShipReadiness(null).verdict).toBe("NO DATA")
    expect(computeShipReadiness([{ scan_type: "debugger", score: null, created_at: "2026-01-01" }]).verdict).toBe("NO DATA")
  })

  it("inverts the loopholes risk score (100 = max risk → 0 readiness contribution)", () => {
    const { breakdown } = computeShipReadiness([
      { scan_type: "loopholes", score: 80, created_at: "2026-01-01" },
    ])
    expect(breakdown.loopholes.raw).toBe(80)
    expect(breakdown.loopholes.adjusted).toBe(20)
  })

  it("only uses each tool's most recent scan", () => {
    const { breakdown } = computeShipReadiness([
      { scan_type: "debugger", score: 40, created_at: "2026-01-01" },
      { scan_type: "debugger", score: 90, created_at: "2026-01-05" },
    ])
    expect(breakdown.debugger.raw).toBe(90)
  })

  it("normalizes by the weight actually used when not every tool has been scanned", () => {
    // Only debugger (weight 0.25) scanned — should equal its own score, not
    // a weighted average diluted by the two unscanned tools.
    const result = computeShipReadiness([{ scan_type: "debugger", score: 88, created_at: "2026-01-01" }])
    expect(result.score).toBe(88)
    expect(result.completeness).toBeCloseTo(1 / 3)
    expect(result.missingTools).toEqual(["audit", "loopholes"])
  })

  it("picks the right verdict band", () => {
    const scoreOf = (s) => computeShipReadiness([{ scan_type: "debugger", score: s, created_at: "2026-01-01" }]).verdict
    expect(scoreOf(90)).toBe("SHIP IT")
    expect(scoreOf(65)).toBe("ALMOST")
    expect(scoreOf(45)).toBe("NEEDS WORK")
    expect(scoreOf(10)).toBe("NOT READY")
  })
})

describe("toolLabel", () => {
  it("returns a human label for known tools and the raw type otherwise", () => {
    expect(toolLabel("loopholes")).toBe("Legal Risk")
    expect(toolLabel("made-up-tool")).toBe("made-up-tool")
  })
})
