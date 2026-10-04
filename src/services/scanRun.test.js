import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("./scanService.js", async (importOriginal) => ({
  ...(await importOriginal()),
  callAI: vi.fn(),
  callAIStream: vi.fn(),
}))
vi.mock("./supabaseService.js", () => ({
  saveScan: vi.fn(),
  attachEmbedding: vi.fn(),
  embeddingText: (tool) => `${tool}: text`,
  authHeader: async () => ({ Authorization: "Bearer test-token" }),
}))
vi.mock("../lib/supabase.js", () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}))

const { callAI, callAIStream } = await import("./scanService.js")
const { saveScan, attachEmbedding } = await import("./supabaseService.js")
const { runScan, findSimilarScans } = await import("./scanRun.js")

const user = { id: "user-1" }
const debuggerResult = { healthScore: 80, summary: "ok", issues: [{ id: 1, severity: "low", title: "x" }] }

beforeEach(() => {
  vi.clearAllMocks()
  saveScan.mockResolvedValue({ data: [{ id: "scan-1" }], error: null })
})

describe("runScan", () => {
  it("returns normalized result, score and suggestions, and saves under user.id", async () => {
    callAI.mockResolvedValue({
      content: { riskScore: 40, greyAreas: [{ regulation: "GDPR", risk: "high" }] },
      error: null,
    })

    const out = await runScan({
      tool: "loopholes",
      payload: { systemDescription: "a chatbot", countries: ["EU"] },
      user,
    })

    expect(out.error).toBeNull()
    expect(out.score).toBe(40)
    expect(out.result.greyAreas[0]).toMatchObject({ id: 1, regulation: "GDPR", risk: "high" })
    expect(Array.isArray(out.suggestions)).toBe(true)
    await vi.waitFor(() =>
      expect(saveScan).toHaveBeenCalledWith("user-1", "loopholes", "a chatbot", out.result, 40)
    )
  })

  it("returns the error and does not save when the AI call fails", async () => {
    callAI.mockResolvedValue({ content: null, error: "boom" })

    const out = await runScan({ tool: "audit", payload: { files: "x" }, user })

    expect(out).toEqual({ result: null, score: null, suggestions: [], error: "boom" })
    expect(saveScan).not.toHaveBeenCalled()
  })

  it("does not save when there is no user", async () => {
    callAI.mockResolvedValue({ content: { riskScore: 10, greyAreas: [] }, error: null })

    await runScan({ tool: "loopholes", payload: { systemDescription: "x" }, user: null })

    expect(saveScan).not.toHaveBeenCalled()
  })

  it("logs a save failure instead of throwing, and skips the embedding", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    callAIStream.mockResolvedValue({ content: debuggerResult, error: null })
    saveScan.mockResolvedValue({ data: null, error: { message: "db down" } })

    const out = await runScan({ tool: "debugger", payload: { code: "x" }, user, stream: true })

    expect(out.error).toBeNull()
    await vi.waitFor(() => expect(log).toHaveBeenCalled())
    expect(attachEmbedding).not.toHaveBeenCalled()
    log.mockRestore()
  })

  it("streams through callAIStream and embeds debugger scans only", async () => {
    const onChunk = vi.fn()
    callAIStream.mockResolvedValue({ content: debuggerResult, error: null })

    await runScan({ tool: "debugger", payload: { code: "x" }, user, stream: true, onChunk })

    expect(callAIStream).toHaveBeenCalledWith("debugger", { code: "x" }, onChunk)
    expect(callAI).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(attachEmbedding).toHaveBeenCalledWith("scan-1", "debugger", debuggerResult))

    callAI.mockResolvedValue({ content: { riskScore: 10, greyAreas: [] }, error: null })
    attachEmbedding.mockClear()
    await runScan({ tool: "loopholes", payload: { systemDescription: "x" }, user })
    await vi.waitFor(() => expect(saveScan).toHaveBeenCalledTimes(2))
    expect(attachEmbedding).not.toHaveBeenCalled()
  })
})

describe("findSimilarScans", () => {
  it("generates an embedding then returns similar scans", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: [0.1] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ similar: [{ id: "old" }] }) })
    vi.stubGlobal("fetch", fetchMock)

    const out = await findSimilarScans("debugger", debuggerResult, user)

    expect(out).toEqual([{ id: "old" }])
    const [, similarReq] = fetchMock.mock.calls[1]
    expect(JSON.parse(similarReq.body)).toEqual({ action: "similar", embedding: [0.1] })
    expect(similarReq.headers.Authorization).toBe("Bearer test-token")
  })

  it("returns [] when the embed endpoint fails or throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
    expect(await findSimilarScans("debugger", debuggerResult, user)).toEqual([])

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")))
    expect(await findSimilarScans("debugger", debuggerResult, user)).toEqual([])
    log.mockRestore()
  })
})
