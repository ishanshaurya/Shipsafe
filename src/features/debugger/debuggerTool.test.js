import { describe, it, expect } from "vitest"
import { debuggerTool } from "./debuggerTool.js"

describe("debuggerTool", () => {
  it("scores by healthScore", () => {
    expect(debuggerTool.score({ healthScore: 80 })).toBe(80)
  })

  it("suggests Audit on repeated vibe-code smells", () => {
    const tools = debuggerTool.suggest({
      healthScore: 100,
      issues: [{ category: "security" }, { category: "vibecode" }, { category: "vibecode" }],
    }).map(s => s.tool)
    expect(tools).toContain("audit")
  })
})
