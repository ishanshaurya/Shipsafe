import { describe, it, expect } from "vitest"
import { scoreVerdict, severityVerdict, scanVerdict } from "./verdict.js"

describe("scoreVerdict", () => {
  it("uses the 80 / 60 bands", () => {
    expect(scoreVerdict(80)).toBe("cleared")
    expect(scoreVerdict(79)).toBe("held")
    expect(scoreVerdict(60)).toBe("held")
    expect(scoreVerdict(59)).toBe("blocked")
  })

  it("inverts risk scores so 100 is Blocked", () => {
    expect(scoreVerdict(100, { risk: true })).toBe("blocked")
    expect(scoreVerdict(40, { risk: true })).toBe("held")
    expect(scoreVerdict(20, { risk: true })).toBe("cleared")
  })
})

describe("severityVerdict", () => {
  it("maps critical/high to Blocked, medium to Held, low to Cleared, any casing", () => {
    expect(severityVerdict("critical")).toBe("blocked")
    expect(severityVerdict("High")).toBe("blocked")
    expect(severityVerdict("medium")).toBe("held")
    expect(severityVerdict("LOW")).toBe("cleared")
  })

  it("falls back to Held for unknown severities", () => {
    expect(severityVerdict(undefined)).toBe("held")
  })
})

describe("scanVerdict", () => {
  it("treats loophole scores as risk and the rest as readiness", () => {
    expect(scanVerdict("loopholes", 72)).toBe("blocked")
    expect(scanVerdict("debugger", 72)).toBe("held")
  })
})
