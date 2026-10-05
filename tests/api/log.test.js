import { afterEach, describe, expect, it } from "vitest"
import { createLog, withLog } from "../../api/_lib/log.js"
import {
  callRoute, resetHarness, requestLines, mockRes, json, sseResponse, geminiText, chatText, embedding, githubFetch, USER, SERVICE_KEY,
} from "./harness.js"

afterEach(resetHarness)

const KEYS = { GEMINI_API_KEY: "g", GROQ_API_KEY: "q" }
const only = (logs) => {
  const lines = requestLines(logs)
  expect(lines).toHaveLength(1)
  return lines[0]
}
const isGemini = (url) => url.includes("generativelanguage.googleapis.com")

describe("request line", () => {
  it("emits one JSON line with id, hashed user, route, action, status, latency and stages", async () => {
    const { logs } = await callRoute("gemini", {
      body: { tool: "regulations", userPrompt: "x" },
      env: { GEMINI_API_KEY: "g" },
      fetchImpl: async () => json(geminiText("{}")),
    })
    const line = only(logs)
    expect(line).toMatchObject({ msg: "request", level: "info", route: "gemini", action: "regulations", status: 200 })
    expect(line.requestId).toEqual(expect.any(String))
    expect(line.userHash).toMatch(/^[0-9a-f]{16}$/)
    expect(line.userHash).not.toBe(USER.id)
    expect(line.latencyMs).toEqual(expect.any(Number))
    expect(Date.parse(line.ts)).not.toBeNaN()
    expect(line.stages.map((s) => s.stage)).toEqual(["auth", "rateLimit", "provider"])
    expect(line.stages[2]).toMatchObject({ provider: "gemini", ok: true, attempt: 1 })
    expect(line.errors).toBeUndefined()
  })

  it("hashes the same user the same way and different users differently", () => {
    const hash = (id) => {
      const lines = []
      const spy = console.log
      console.log = (l) => lines.push(JSON.parse(l))
      const log = createLog({ headers: {} }, "t")
      log.setUser({ id })
      log.finish(200)
      console.log = spy
      return lines[0].userHash
    }
    expect(hash("u1")).toBe(hash("u1"))
    expect(hash("u1")).not.toBe(hash("u2"))
  })

  it("logs 401 with no user hash and no action leak", async () => {
    const { logs } = await callRoute("gemini", { body: { tool: "debugger", userPrompt: "x" }, token: null, env: KEYS })
    const line = only(logs)
    expect(line).toMatchObject({ status: 401, level: "warn", userHash: null, action: "debugger" })
    expect(line.stages.map((s) => s.stage)).toEqual(["auth"])
  })

  it("logs 429 with the rate limit stage", async () => {
    const { logs } = await callRoute("gemini", { body: { tool: "audit", userPrompt: "x" }, env: KEYS, rpc: () => ({ data: 99, error: null }) })
    const line = only(logs)
    expect(line.status).toBe(429)
    expect(line.stages.map((s) => s.stage)).toEqual(["auth", "rateLimit"])
  })

  it("logs 5xx on the error stream and everything else on log", async () => {
    const fail = await callRoute("gemini", { body: { tool: "audit", userPrompt: "x" }, env: KEYS, fetchImpl: async () => new Response("x", { status: 500 }) })
    expect(fail.logs.map((l) => l.stream)).toEqual(["error"])
    expect(only(fail.logs).level).toBe("error")
    const ok = await callRoute("gemini", { body: { tool: "audit", userPrompt: "x" }, env: { GEMINI_API_KEY: "g" }, fetchImpl: async () => json(geminiText("{}")) })
    expect(ok.logs.map((l) => l.stream)).toEqual(["log"])
  })

  it("records every provider attempt on failover", async () => {
    const { logs } = await callRoute("gemini", {
      body: { tool: "debugger", userPrompt: "x" },
      env: KEYS,
      fetchImpl: async (url) => (isGemini(url) ? new Response("quota", { status: 429 }) : json(chatText("ok"))),
    })
    const providers = only(logs).stages.filter((s) => s.stage === "provider")
    expect(providers).toEqual([
      { stage: "provider", ms: expect.any(Number), provider: "gemini", ok: false, status: 429, attempt: 1 },
      { stage: "provider", ms: expect.any(Number), provider: "groq", ok: true, attempt: 2 },
    ])
  })

  it("measures real elapsed time per stage", async () => {
    const { logs } = await callRoute("gemini", {
      body: { tool: "regulations", userPrompt: "x" },
      env: { GEMINI_API_KEY: "g" },
      rpc: async () => {
        await new Promise((r) => setTimeout(r, 30))
        return { data: 1, error: null }
      },
      fetchImpl: async () => {
        await new Promise((r) => setTimeout(r, 60))
        return json(geminiText("{}"))
      },
    })
    const line = only(logs)
    const ms = Object.fromEntries(line.stages.map((s) => [s.stage, s.ms]))
    expect(ms.rateLimit).toBeGreaterThanOrEqual(25)
    expect(ms.provider).toBeGreaterThanOrEqual(55)
    expect(line.latencyMs).toBeGreaterThanOrEqual(ms.rateLimit + ms.provider - 1)
  })

  it("streams record first-byte and total time, and failed attempts", async () => {
    const { logs } = await callRoute("gemini", {
      body: { tool: "audit", userPrompt: "x", stream: true },
      env: KEYS,
      fetchImpl: async (url) =>
        isGemini(url) ? new Response("down", { status: 503 }) : sseResponse('data: {"choices":[{"delta":{"content":"a"}}]}\n\n'),
    })
    const providers = only(logs).stages.filter((s) => s.stage === "provider")
    expect(providers[0]).toMatchObject({ provider: "gemini", ok: false, status: 503, attempt: 1 })
    expect(providers[1]).toMatchObject({ provider: "groq", ok: true, ttfbMs: expect.any(Number) })
    expect(providers[1].ms).toBeGreaterThanOrEqual(providers[1].ttfbMs)
  })

  it("embed logs the embedding provider call and DB calls as stages", async () => {
    const env = { GEMINI_API_KEY: "g", SUPABASE_SERVICE_ROLE: SERVICE_KEY }
    const gen = await callRoute("embed", { body: { action: "generate", text: "x" }, env, fetchImpl: async () => json({ embedding: { values: [1] } }) })
    expect(only(gen.logs)).toMatchObject({ route: "embed", action: "generate", status: 200 })
    expect(only(gen.logs).stages.map((s) => s.stage)).toEqual(["auth", "rateLimit", "embed"])
    expect(only(gen.logs).stages[2]).toMatchObject({ provider: "gemini", ok: true })

    const sim = await callRoute("embed", { body: { action: "similar", embedding: embedding() }, env })
    expect(only(sim.logs).stages.map((s) => s.stage)).toEqual(["auth", "rateLimit", "db"])
    const save = await callRoute("embed", { body: { action: "save", scanId: "s", embedding: embedding() }, env })
    expect(only(save.logs)).toMatchObject({ action: "save", status: 200 })
    expect(only(save.logs).stages.map((s) => s.stage)).toEqual(["auth", "rateLimit", "db"])
  })

  it("github logs list vs import as the action", async () => {
    const list = await callRoute("github", { body: { url: "https://github.com/octo/app", mode: "list" }, fetchImpl: githubFetch() })
    expect(only(list.logs)).toMatchObject({ route: "github", action: "list", status: 200 })
    const imp = await callRoute("github", { body: { url: "https://github.com/octo/app" }, fetchImpl: githubFetch() })
    expect(only(imp.logs).action).toBe("import")
  })

  it("keeps only error name, short code and numeric status", async () => {
    const { logs } = await callRoute("embed", {
      body: { action: "similar", embedding: embedding() },
      env: { GEMINI_API_KEY: "g" },
      rpc: (name) =>
        name === "match_scans"
          ? { data: null, error: { name: "PostgrestError", code: "42501", message: "permission denied for table scan_history: LEAK_ME" } }
          : { data: 1, error: null },
    })
    const line = only(logs)
    expect(line.status).toBe(502)
    expect(line.errors).toEqual([{ where: "similar", name: "PostgrestError", code: "42501" }])
  })
})

describe("untrusted values", () => {
  it("records unknown or hostile actions as 'other'", async () => {
    for (const tool of ["'; drop table", "x\ny", { a: 1 }, undefined, "__proto__"]) {
      const { logs } = await callRoute("gemini", { body: { tool, userPrompt: "x" }, env: KEYS, fetchImpl: async () => json(geminiText("{}")) })
      expect(only(logs).action).toBe("other")
    }
    const { logs } = await callRoute("embed", { body: { action: "evil\n{}" }, env: KEYS })
    expect(only(logs).action).toBe("other")
  })

  it("uses x-vercel-id as request id only when it is safe", async () => {
    const body = { tool: "audit", userPrompt: "x" }
    const safe = await callRoute("gemini", { body, env: KEYS, headers: { "x-vercel-id": "iad1::abc-123" } })
    expect(only(safe.logs).requestId).toBe("iad1::abc-123")
    const unsafe = await callRoute("gemini", { body, env: KEYS, headers: { "x-vercel-id": 'a"\n{"msg":"forged"}' } })
    expect(only(unsafe.logs).requestId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("stage and error helpers drop non-allow-listed fields", () => {
    const lines = []
    const spy = console.log
    console.log = (l) => lines.push(JSON.parse(l))
    const log = createLog({ headers: {} }, "t")
    log.stage("provider", 5, { provider: "gemini", prompt: "SECRET", nested: { a: 1 }, ok: true })
    log.error("where", { name: "Error", code: "has spaces and is far too long to be a code", message: "SECRET", status: "401" })
    log.finish(200)
    console.log = spy
    expect(lines[0].stages).toEqual([{ stage: "provider", ms: 5, provider: "gemini", ok: true }])
    expect(lines[0].errors).toEqual([{ where: "where", name: "Error" }])
  })
})

describe("withLog", () => {
  it("logs a thrown handler as 500 and rethrows", async () => {
    const lines = []
    const spy = console.error
    console.error = (l) => lines.push(JSON.parse(l))
    const res = mockRes()
    await expect(withLog("boom", async () => {
      throw new TypeError("SECRET_THROWN_MESSAGE")
    })({ headers: {} }, res)).rejects.toThrow("SECRET_THROWN_MESSAGE")
    console.error = spy
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ status: 500, level: "error", route: "boom", errors: [{ where: "unhandled", name: "TypeError" }] })
    expect(JSON.stringify(lines)).not.toMatch(/SECRET_THROWN_MESSAGE/)
  })
})

describe("nothing sensitive reaches the logs", () => {
  const SECRET = {
    prompt: "SENTINEL_PROMPT_5f3a",
    code: "SENTINEL_CODE_9c1e",
    apiKeyGemini: "SENTINEL_KEY_GEMINI_77ab",
    apiKeyGroq: "SENTINEL_KEY_GROQ_21cd",
    serviceRole: "SENTINEL_SERVICE_ROLE_88ef",
    githubToken: "SENTINEL_GH_TOKEN_44aa",
    response: "SENTINEL_RESPONSE_BODY_30bb",
    providerError: "SENTINEL_PROVIDER_ERR_62dd",
    dbError: "SENTINEL_DB_ERR_19ee",
    repoFile: "SENTINEL_REPO_FILE_81ff",
  }
  // user token is fixed by the harness; email and raw id come from USER
  const FORBIDDEN = [...Object.values(SECRET), "good-token", "forged-token", USER.email, USER.id, "anon-key"]

  const env = {
    GEMINI_API_KEY: SECRET.apiKeyGemini,
    GROQ_API_KEY: SECRET.apiKeyGroq,
    SUPABASE_SERVICE_ROLE: SECRET.serviceRole,
    GITHUB_TOKEN: SECRET.githubToken,
  }
  const prompt = `${SECRET.prompt} ${SECRET.code}`
  const failAndOk = async (url) =>
    isGemini(url) ? new Response(SECRET.providerError, { status: 500 }) : json(chatText(SECRET.response))
  const dbErr = { message: SECRET.dbError, details: SECRET.dbError, hint: SECRET.dbError }

  const scenarios = {
    "gemini success": () => callRoute("gemini", { body: { tool: "debugger", userPrompt: prompt }, env, fetchImpl: async () => json(geminiText(SECRET.response)) }),
    "gemini failover with provider error body": () => callRoute("gemini", { body: { tool: "audit", userPrompt: prompt }, env, fetchImpl: failAndOk }),
    "gemini all providers fail": () => callRoute("gemini", { body: { tool: "audit", userPrompt: prompt }, env, fetchImpl: async () => new Response(SECRET.providerError, { status: 500 }) }),
    "gemini stream": () => callRoute("gemini", { body: { tool: "audit", userPrompt: prompt, stream: true }, env, fetchImpl: async (url) => isGemini(url) ? new Response(SECRET.providerError, { status: 503 }) : sseResponse(`data: ${JSON.stringify({ choices: [{ delta: { content: SECRET.response } }] })}\n\n`) }),
    "gemini invalid token": () => callRoute("gemini", { body: { tool: "audit", userPrompt: prompt }, env, token: "forged-token" }),
    "gemini no token": () => callRoute("gemini", { body: { tool: "audit", userPrompt: prompt }, env, token: null }),
    "gemini rate limited": () => callRoute("gemini", { body: { tool: "audit", userPrompt: prompt }, env, rpc: () => ({ data: 99, error: null }) }),
    "gemini rate limit db error": () => callRoute("gemini", { body: { tool: "audit", userPrompt: prompt }, env, rpc: () => ({ data: null, error: dbErr }) }),
    "gemini bad input": () => callRoute("gemini", { body: { tool: SECRET.prompt, userPrompt: prompt }, env }),
    "embed generate": () => callRoute("embed", { body: { action: "generate", text: prompt }, env, fetchImpl: async () => json({ embedding: { values: [0.1] } }) }),
    "embed generate provider error": () => callRoute("embed", { body: { action: "generate", text: prompt }, env, fetchImpl: async () => new Response(SECRET.providerError, { status: 500 }) }),
    "embed similar db error": () => callRoute("embed", { body: { action: "similar", embedding: embedding() }, env, rpc: (n) => (n === "match_scans" ? { data: null, error: dbErr } : { data: 1, error: null }) }),
    "embed similar results": () => callRoute("embed", { body: { action: "similar", embedding: embedding() }, env, rpc: (n) => (n === "match_scans" ? { data: [{ id: "s", input_snippet: SECRET.response }], error: null } : { data: 1, error: null }) }),
    "embed save db error": () => callRoute("embed", { body: { action: "save", scanId: "s", embedding: embedding() }, env, updateResult: { error: dbErr } }),
    "github import": () => callRoute("github", { body: { url: "https://github.com/octo/app" }, env, fetchImpl: githubFetch({ tree: [{ type: "blob", path: `${SECRET.repoFile}.js`, size: 5 }] }) }),
    "github upstream error": () => callRoute("github", { body: { url: "https://github.com/octo/app" }, env, fetchImpl: githubFetch({ missingRepo: true }) }),
    "github bad url": () => callRoute("github", { body: { url: `https://github.com/${SECRET.prompt}/..` }, env }),
  }

  it.each(Object.keys(scenarios))("%s", async (name) => {
    const { logs } = await scenarios[name]()
    const lines = requestLines(logs)
    expect(lines).toHaveLength(1)
    const raw = logs.map((l) => l.args.join(" ")).join("\n")
    for (const secret of FORBIDDEN) expect(raw, `leaked ${secret}`).not.toContain(secret)
    // and the line has no field outside the known set
    const top = new Set(["ts", "level", "msg", "requestId", "route", "action", "userHash", "status", "latencyMs", "stages", "errors"])
    for (const k of Object.keys(lines[0])) expect(top.has(k), `unexpected field ${k}`).toBe(true)
  })

  it("the sentinels do reach the handlers (guards against a vacuous test)", async () => {
    const { fetch } = await scenarios["gemini failover with provider error body"]()
    expect(JSON.stringify(fetch.mock.calls)).toContain(SECRET.prompt)
    expect(JSON.stringify(fetch.mock.calls)).toContain(SECRET.apiKeyGroq)
  })
})
