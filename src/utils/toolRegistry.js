// src/utils/toolRegistry.js
//
// The four tools, in the two groups the UI shows them in.
// Rail, landing page and dashboard all read from here.

export const TOOL_GROUPS = [
  {
    group: "Code review",
    tools: [
      { id: "debugger", name: "AI Debugger", path: "/debugger", desc: "Bugs, security holes and vibe-code smells in pasted code or a GitHub repo." },
      { id: "audit", name: "Vibe-Code Audit", path: "/audit", desc: "Scored report on security, quality, maintainability, AI patterns and deploy readiness." },
    ],
  },
  {
    group: "AI regulation",
    tools: [
      { id: "regulations", name: "Regulations", path: "/regulations", desc: "Laws by topic, who is at risk, and a checklist you can act on." },
      { id: "loopholes", name: "Loophole Finder", path: "/loopholes", desc: "Where the rules are ambiguous for your system and countries." },
    ],
  },
]

export const TOOLS = TOOL_GROUPS.flatMap((g) => g.tools)
