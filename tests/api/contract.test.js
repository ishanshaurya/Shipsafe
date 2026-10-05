import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it } from "vitest"
import { callRoute, resetHarness, json, sseResponse, geminiText, embedding, githubFetch } from "./harness.js"

afterEach(resetHarness)

// The contract is read from docs/redesign/CONTRACTS.md at test time. Every
// documented route, success shape, error code, rate limit and the 401 body
// must have a replay below, and every replay must match the doc. Editing the
// contract without updating the replays (or the reverse) fails here.
const doc = readFileSync(new URL("../../docs/redesign/CONTRACTS.md", import.meta.url), "utf8")

const section = (heading) => {
  const start = doc.indexOf(heading)
  if (start < 0) throw new Error(`CONTRACTS.md has no section "${heading}"`)
  const rest = doc.slice(start + heading.length)
  const next = rest.search(/^## /m)
  return next < 0 ? rest : rest.slice(0, next)
}

// Top-level keys of a documented shape like `{repo:{a,b}, files:[{c}], n}`.
function topLevelKeys(shape) {
  const parts = []
  let depth = 0
  let cur = ""
  for (const ch of shape.slice(1, -1)) {
    if ("{[(".includes(ch)) depth++
    if ("}])".includes(ch)) depth--
    if (ch === "," && depth === 0) {
      parts.push(cur)
      cur = ""
    } else cur += ch
  }
  parts.push(cur)
  return parts.map((p) => p.trim().split(":")[0].trim()).filter(Boolean).sort()
}

const successShapes = (text) => [...text.matchAll(/`200 (\{[^`]*\})`/g)].map((m) => topLevelKeys(m[1]))
const errorCodes = (text) => {
  const line = text.match(/^- Errors:.*$/m)?.[0] ?? ""
  return [...new Set([...line.matchAll(/`(\d{3})/g)].map((m) => Number(m[1])))]
}

// Replay setup shared by the three routes.
const GEMINI = { GEMINI_API_KEY: "g" }
const github = { url: "https://github.com/octo/app" }
const over = (n) => ({ rpc: () => ({ data: n, error: null }) })

const ROUTES = {
  "/api/gemini": {
    call: (body, opts = {}) => callRoute("gemini", { body, env: GEMINI, fetchImpl: async () => json(geminiText("{}")), ...opts }),
    // one entry per documented `200 {...}` shape, in document order
    successes: [async () => (await ROUTES["/api/gemini"].call({ tool: "debugger", userPrompt: "x" })).res.body],
    errors: {
      400: async () => ROUTES["/api/gemini"].call({ tool: "bogus", userPrompt: "x" }),
      401: async () => ROUTES["/api/gemini"].call({ tool: "debugger", userPrompt: "x" }, { token: null }),
      429: async () => ROUTES["/api/gemini"].call({ tool: "debugger", userPrompt: "x" }, over(21)),
      500: async () => ROUTES["/api/gemini"].call({ tool: "debugger", userPrompt: "x" }, { env: {} }),
      502: async () =>
        ROUTES["/api/gemini"].call(
          { tool: "debugger", userPrompt: "x" },
          { fetchImpl: async () => new Response("down", { status: 500 }) }
        ),
    },
    rateLimit: (n) => ROUTES["/api/gemini"].call({ tool: "debugger", userPrompt: "x" }, over(n)),
  },
  "/api/github": {
    call: (body, opts = {}) => callRoute("github", { body, fetchImpl: githubFetch(), ...opts }),
    successes: [
      async () => (await ROUTES["/api/github"].call(github)).res.body,
      async () => (await ROUTES["/api/github"].call({ ...github, mode: "list" })).res.body,
    ],
    errors: {
      400: async () => ROUTES["/api/github"].call({ url: "https://github.com/../x" }),
      401: async () => ROUTES["/api/github"].call(github, { token: null }),
      404: async () => ROUTES["/api/github"].call(github, { fetchImpl: githubFetch({ tree: [] }) }),
      429: async () => ROUTES["/api/github"].call(github, over(16)),
      502: async () => ROUTES["/api/github"].call(github, { fetchImpl: githubFetch({ missingRepo: true }) }),
    },
  },
  "/api/embed": {
    call: (body, opts = {}) =>
      callRoute("embed", { body, env: GEMINI, fetchImpl: async () => json({ embedding: { values: [0.1] } }), ...opts }),
    successes: [
      async () => (await ROUTES["/api/embed"].call({ action: "generate", text: "x" })).res.body,
      async () =>
        (
          await ROUTES["/api/embed"].call(
            { action: "similar", embedding: embedding() },
            { rpc: (name) => ({ data: name === "match_scans" ? [{ id: "s", similarity: 0.9 }] : 1, error: null }) }
          )
        ).res.body,
      async () => (await ROUTES["/api/embed"].call({ action: "save", scanId: "s", embedding: embedding() })).res.body,
    ],
    errors: {
      400: async () => ROUTES["/api/embed"].call({ action: "nope" }),
      401: async () => ROUTES["/api/embed"].call({ action: "generate", text: "x" }, { token: null }),
      429: async () => ROUTES["/api/embed"].call({ action: "generate", text: "x" }, over(61)),
      502: async () =>
        ROUTES["/api/embed"].call(
          { action: "generate", text: "x" },
          { fetchImpl: async () => new Response("down", { status: 500 }) }
        ),
    },
  },
}

describe("auth (all routes)", () => {
  const body = JSON.parse(section("## Auth").match(/`401 (\{[^`]*\})`/)[1])

  it.each(Object.keys(ROUTES))("%s replies 401 with the documented body for missing and invalid tokens", async (route) => {
    for (const token of [null, "forged"]) {
      const { res } = await ROUTES[route].call({}, { token })
      expect(res.statusCode).toBe(401)
      expect(res.body).toEqual(body)
    }
  })
})

describe.each(Object.keys(ROUTES))("%s matches CONTRACTS.md", (route) => {
  const text = section(`## POST ${route}`)
  const replay = ROUTES[route]

  it("replays every documented success shape", async () => {
    const shapes = successShapes(text)
    expect(shapes.length).toBe(replay.successes.length)
    for (const [i, keys] of shapes.entries()) {
      const body = await replay.successes[i]()
      expect(Object.keys(body).sort(), `example #${i + 1}`).toEqual(keys)
    }
  })

  it("replays every documented error code with an { error: string } body", async () => {
    const codes = errorCodes(text)
    expect(Object.keys(replay.errors).map(Number).sort()).toEqual([...codes].sort())
    for (const code of codes) {
      const { res } = await replay.errors[code]()
      expect(res.statusCode, `code ${code}`).toBe(code)
      expect(res.body).toEqual({ error: expect.any(String) })
    }
  })
})

describe("/api/gemini documented specifics", () => {
  const text = section("## POST /api/gemini")

  it("rate limit is the documented N requests per minute per user", async () => {
    const n = Number(text.match(/over (\d+) req\/min\/user/)[1])
    expect((await ROUTES["/api/gemini"].rateLimit(n)).res.statusCode).toBe(200)
    expect((await ROUTES["/api/gemini"].rateLimit(n + 1)).res.statusCode).toBe(429)
  })

  it("stream replies text/event-stream with data: {chunk} lines then data: [DONE]", async () => {
    expect(text).toMatch(/text\/event-stream/)
    expect(text).toMatch(/data: \{"chunk": string\}/)
    expect(text).toMatch(/data: \[DONE\]/)
    const { res } = await callRoute("gemini", {
      body: { tool: "audit", userPrompt: "x", stream: true },
      env: GEMINI,
      fetchImpl: async () => sseResponse(`data: ${JSON.stringify(geminiText("a"))}\n\n`),
    })
    expect(res.headers["Content-Type"]).toBe("text/event-stream")
    expect(res.chunks.at(-1)).toBe("data: [DONE]\n\n")
    for (const line of res.chunks.slice(0, -1)) {
      expect(line).toMatch(/^data: \{"chunk":"[^"]*"\}\n\n$/)
    }
  })

  it("non-stream 200 has string content and provider", async () => {
    const { content, provider } = await ROUTES["/api/gemini"].successes[0]()
    expect(typeof content).toBe("string")
    expect(typeof provider).toBe("string")
  })
})

describe("/api/github documented specifics", () => {
  it("list mode returns file objects, quick mode returns path strings", async () => {
    const [quick, list] = await Promise.all(ROUTES["/api/github"].successes.map((f) => f()))
    expect(quick.files.every((f) => typeof f === "string")).toBe(true)
    expect(list.files.every((f) => Object.keys(f).sort().join() === "autoSelected,path,size")).toBe(true)
    expect(Object.keys(quick.repo).sort()).toEqual(["description", "language", "name", "stars", "url"])
  })
})

describe("database objects the app relies on", () => {
  const text = section("## Database objects the app relies on")
  const migrations = ["0001_rate_limits", "0003_scan_history", "0004_reports", "0005_regulations", "0006_match_scans", "0007_match_scans_caller_identity", "0008_rate_limit_buckets"]
    .map((f) => readFileSync(new URL(`../../supabase/migrations/${f}.sql`, import.meta.url), "utf8"))
    .join("\n")

  it("defines every documented table and function in supabase/migrations", () => {
    for (const table of ["scan_history", "reports", "regulations", "rate_limits"]) {
      expect(text).toContain(table)
      expect(migrations).toMatch(new RegExp(`create table (if not exists )?public\\.${table}\\b`))
    }
    for (const fn of ["increment_rate_limit", "match_scans"]) {
      expect(text).toContain(fn)
      expect(migrations).toMatch(new RegExp(`create (or replace )?function public\\.${fn}\\(`))
    }
    expect(migrations).toMatch(/embedding vector\(768\)/)
  })
})
