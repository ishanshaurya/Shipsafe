import { afterEach, describe, expect, it } from "vitest"
import { callRoute, resetHarness, json, embedding, USER, SERVICE_KEY } from "./harness.js"

afterEach(resetHarness)

const ENV = { GEMINI_API_KEY: "g" }
const geminiEmbed = async () => json({ embedding: { values: [0.1, 0.2] } })

describe("POST /api/embed", () => {
  it("401 without a token or with an invalid one", async () => {
    const body = { action: "generate", text: "hi" }
    for (const token of [null, "forged"]) {
      const { res, fetch } = await callRoute("embed", { body, token, env: ENV })
      expect(res.statusCode).toBe(401)
      expect(res.body).toEqual({ error: "Sign in required" })
      expect(fetch).not.toHaveBeenCalled()
    }
  })

  it.each([
    ["unknown action", { action: "drop" }],
    ["no body", undefined],
    ["generate without text", { action: "generate" }],
    ["generate with non-string text", { action: "generate", text: 5 }],
    ["generate with oversized text", { action: "generate", text: "x".repeat(10_001) }],
    ["similar without embedding", { action: "similar" }],
    ["similar with wrong dimensions", { action: "similar", embedding: embedding(767) }],
    ["similar with non-numeric entries", { action: "similar", embedding: [...embedding(767), "x"] }],
    ["similar with NaN entry", { action: "similar", embedding: [...embedding(767), NaN] }],
    ["save without scanId", { action: "save", embedding: embedding() }],
    ["save with bad embedding", { action: "save", scanId: "s1", embedding: [1] }],
  ])("400 on %s", async (_, body) => {
    const { res, state, fetch } = await callRoute("embed", { body, env: ENV })
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toEqual(expect.any(String))
    expect(fetch).not.toHaveBeenCalled()
    expect(state.rpcCalls.filter((c) => c.name === "match_scans")).toEqual([])
    expect(state.updates).toEqual([])
  })

  it("429 over 60 requests in the window, and counts in the embed bucket", async () => {
    const body = { action: "generate", text: "hi" }
    const atLimit = await callRoute("embed", { body, env: ENV, rpc: () => ({ data: 60, error: null }), fetchImpl: geminiEmbed })
    expect(atLimit.res.statusCode).toBe(200)

    const over = await callRoute("embed", { body, env: ENV, rpc: () => ({ data: 61, error: null }) })
    expect(over.res.statusCode).toBe(429)
    expect(over.res.body).toEqual({ error: expect.stringMatching(/Rate limit exceeded/) })
    expect(over.fetch).not.toHaveBeenCalled()
    expect(over.state.rpcCalls[0].args.p_bucket).toBe("embed")
  })

  it("502 when the rate limit check fails", async () => {
    const { res } = await callRoute("embed", {
      body: { action: "generate", text: "hi" },
      env: ENV,
      rpc: () => ({ data: null, error: { message: "db down" } }),
    })
    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({ error: "Rate limit check failed" })
  })

  it("generate returns the embedding", async () => {
    const { res } = await callRoute("embed", { body: { action: "generate", text: "hi" }, env: ENV, fetchImpl: geminiEmbed })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ embedding: [0.1, 0.2] })
  })

  it("502 when the embedding provider fails", async () => {
    const { res } = await callRoute("embed", {
      body: { action: "generate", text: "hi" },
      env: ENV,
      fetchImpl: async () => new Response("down", { status: 500 }),
    })
    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({ error: "Embedding unavailable" })
  })

  describe("ownership", () => {
    it("similar runs through the caller's own client and sends no user id", async () => {
      const rows = [{ id: "s1", similarity: 0.9 }]
      const { res, state } = await callRoute("embed", {
        body: { action: "similar", embedding: embedding(), currentScanId: "cur", match_user_id: "someone-else" },
        env: { ...ENV, SUPABASE_SERVICE_ROLE: SERVICE_KEY },
        rpc: (name) => (name === "match_scans" ? { data: rows, error: null } : { data: 1, error: null }),
      })
      expect(res.body).toEqual({ similar: rows })
      const call = state.rpcCalls.find((c) => c.name === "match_scans")
      expect(call.client.key).toBe("anon-key")
      expect(call.client.opts.global.headers.Authorization).toBe("Bearer good-token")
      expect(call.args).toEqual({
        query_embedding: embedding(),
        exclude_scan_id: "cur",
        match_threshold: 0.4,
        match_count: 5,
      })
    })

    it.each([
      [undefined, 5],
      [0, 5],
      [-3, 1],
      [3, 3],
      [99, 10],
      ["abc", 5],
    ])("similar limit %s becomes match_count %s", async (limit, expected) => {
      const { state } = await callRoute("embed", {
        body: { action: "similar", embedding: embedding(), limit },
        env: ENV,
      })
      expect(state.rpcCalls.find((c) => c.name === "match_scans").args.match_count).toBe(expected)
    })

    it("502 when the similarity search errors", async () => {
      const { res } = await callRoute("embed", {
        body: { action: "similar", embedding: embedding() },
        env: ENV,
        rpc: (name) => (name === "match_scans" ? { data: null, error: { message: "boom" } } : { data: 1, error: null }),
      })
      expect(res.statusCode).toBe(502)
      expect(res.body).toEqual({ error: "Similarity search unavailable" })
    })

    it("save with the service role still filters on the verified user id", async () => {
      const { res, state } = await callRoute("embed", {
        body: { action: "save", scanId: "scan-9", embedding: embedding(), user_id: "attacker" },
        env: { ...ENV, SUPABASE_SERVICE_ROLE: SERVICE_KEY },
      })
      expect(res.body).toEqual({ success: true })
      expect(state.updates).toHaveLength(1)
      const [update] = state.updates
      expect(update.client.key).toBe(SERVICE_KEY)
      expect(update.table).toBe("scan_history")
      expect(update.filters).toEqual([
        ["id", "scan-9"],
        ["user_id", USER.id],
      ])
      expect(update.values).toEqual({ embedding: embedding() })
    })

    it("save without a service role falls back to the caller's client", async () => {
      const { state } = await callRoute("embed", {
        body: { action: "save", scanId: "scan-9", embedding: embedding() },
        env: ENV,
      })
      expect(state.updates[0].client.key).toBe("anon-key")
      expect(state.updates[0].filters).toContainEqual(["user_id", USER.id])
    })

    it("502 when the save fails", async () => {
      const { res } = await callRoute("embed", {
        body: { action: "save", scanId: "s", embedding: embedding() },
        env: ENV,
        updateResult: { error: { message: "nope" } },
      })
      expect(res.statusCode).toBe(502)
      expect(res.body).toEqual({ error: "Embedding save failed" })
    })
  })
})
