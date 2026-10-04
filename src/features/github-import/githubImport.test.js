import { describe, it, expect, vi, afterEach } from "vitest"

vi.mock("../../shared/authHeader.js", () => ({
  authHeader: async () => ({ Authorization: "Bearer test-token" }),
}))

const { importRepo, listRepoFiles, fetchRepoFiles } = await import("./githubImport.js")

const jsonResponse = (body, status = 200) =>
  ({ ok: status < 400, status, json: () => Promise.resolve(body) })

const mockFetch = (impl) => {
  const fn = vi.fn(impl)
  vi.stubGlobal("fetch", fn)
  return fn
}

const sentBody = (fn) => JSON.parse(fn.mock.calls[0][1].body)

afterEach(() => vi.unstubAllGlobals())

describe("request shapes", () => {
  it("importRepo sends only the trimmed url", async () => {
    const fn = mockFetch(() => Promise.resolve(jsonResponse({ code: "x" })))
    const { data, error } = await importRepo("  https://github.com/a/b  ")
    expect(sentBody(fn)).toEqual({ url: "https://github.com/a/b" })
    expect(data).toEqual({ code: "x" })
    expect(error).toBeNull()
  })

  it("listRepoFiles sends mode:list", async () => {
    const fn = mockFetch(() => Promise.resolve(jsonResponse({ files: [] })))
    await listRepoFiles("https://github.com/a/b")
    expect(sentBody(fn)).toEqual({ url: "https://github.com/a/b", mode: "list" })
  })

  it("fetchRepoFiles sends the chosen paths", async () => {
    const fn = mockFetch(() => Promise.resolve(jsonResponse({ code: "x" })))
    await fetchRepoFiles("https://github.com/a/b", ["src/a.js"])
    expect(sentBody(fn)).toEqual({ url: "https://github.com/a/b", files: ["src/a.js"] })
  })
})

describe("errors", () => {
  it("surfaces the server's error message", async () => {
    mockFetch(() => Promise.resolve(jsonResponse({ error: "Repository not found or is private." }, 404)))
    const { data, error } = await importRepo("https://github.com/a/b")
    expect(data).toBeNull()
    expect(error).toBe("Repository not found or is private.")
  })

  it("shows the sign-in message when the session is missing or expired", async () => {
    mockFetch(() => Promise.resolve(jsonResponse({ error: "Sign in required" }, 401)))
    expect(await listRepoFiles("https://github.com/a/b")).toEqual({ data: null, error: "Sign in required" })
  })

  it("falls back to a per-call message when the server sends none", async () => {
    mockFetch(() => Promise.resolve(jsonResponse({}, 400)))
    expect((await importRepo("u")).error).toBe("Failed to fetch repo")
    expect((await fetchRepoFiles("u", ["a"])).error).toBe("Failed to fetch files")
  })

  it("reports a timeout, not a network error, when a 504 returns HTML", async () => {
    mockFetch(() => Promise.resolve({
      ok: false,
      status: 504,
      json: () => Promise.reject(new SyntaxError("Unexpected token <")),
    }))
    const { error } = await importRepo("https://github.com/a/b")
    expect(error).toMatch(/timed out/)
  })

  it("reports a network error when fetch itself rejects", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")))
    const { data, error } = await importRepo("https://github.com/a/b")
    expect(data).toBeNull()
    expect(error).toMatch(/Network error/)
  })

  it("returns aborted with no error when the caller's signal fires", async () => {
    mockFetch(() => Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" })))
    const result = await importRepo("https://github.com/a/b", { signal: new AbortController().signal })
    expect(result).toEqual({ data: null, error: null, aborted: true })
  })
})

describe("auth", () => {
  it("sends the session bearer token on every request", async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ code: "x" }))
    await importRepo("https://github.com/o/r")
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token")
  })
})
