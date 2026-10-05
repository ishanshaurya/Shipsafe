import { afterEach, describe, expect, it } from "vitest"
import { callRoute, resetHarness, githubFetch } from "./harness.js"

afterEach(resetHarness)

const run = (body, opts = {}) => callRoute("github", { body, fetchImpl: githubFetch(), ...opts })

describe("POST /api/github", () => {
  it("401 without a token or with an invalid one", async () => {
    for (const token of [null, "forged"]) {
      const { res, fetch } = await run({ url: "https://github.com/octo/app" }, { token })
      expect(res.statusCode).toBe(401)
      expect(res.body).toEqual({ error: "Sign in required" })
      expect(fetch).not.toHaveBeenCalled()
    }
  })

  describe("400 on bad input", () => {
    it.each([
      ["no body", undefined, "No GitHub URL provided"],
      ["missing url", {}, "No GitHub URL provided"],
      ["blank url", { url: "   " }, "No GitHub URL provided"],
      ["non-string url", { url: 7 }, "No GitHub URL provided"],
    ])("%s", async (_, body, error) => {
      const { res, fetch } = await run(body)
      expect(res.statusCode).toBe(400)
      expect(res.body).toEqual({ error })
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe("owner/repo name validation", () => {
    it.each([
      ["not github", "https://gitlab.com/octo/app"],
      ["github lookalike host", "https://github.com.evil.io/octo/app"],
      ["owner only", "https://github.com/octo"],
      ["dot-dot owner", "https://github.com/../app"],
      ["dot-dot repo", "https://github.com/octo/.."],
      ["single-dot repo", "https://github.com/octo/."],
      ["encoded slash in owner", "https://github.com/oc%2Fto/app"],
      ["query chars in repo", "https://github.com/octo/app?x=1"],
      ["space in owner", "https://github.com/oc to/app"],
      ["shell chars in repo", "https://github.com/octo/app;rm"],
      ["empty owner", "https://github.com//app"],
    ])("rejects %s without calling GitHub", async (_, url) => {
      const { res, fetch } = await run({ url })
      expect(res.statusCode).toBe(400)
      expect(res.body.error).toMatch(/Invalid GitHub URL/)
      expect(fetch).not.toHaveBeenCalled()
    })

    it.each([
      "https://github.com/octo/app",
      "github.com/octo/app/",
      "https://github.com/octo/app.git",
      "https://github.com/octo/app/tree/main",
      "https://github.com/octo/app/issues/3",
    ])("accepts %s", async (url) => {
      const { res } = await run({ url })
      expect(res.statusCode).toBe(200)
    })
  })

  it("429 over 15 requests in the window, and counts in the github bucket", async () => {
    const atLimit = await run({ url: "https://github.com/octo/app" }, { rpc: () => ({ data: 15, error: null }) })
    expect(atLimit.res.statusCode).toBe(200)

    const over = await run({ url: "https://github.com/octo/app" }, { rpc: () => ({ data: 16, error: null }) })
    expect(over.res.statusCode).toBe(429)
    expect(over.res.body).toEqual({ error: expect.stringMatching(/Rate limit exceeded/) })
    expect(over.fetch).not.toHaveBeenCalled()
    expect(over.state.rpcCalls[0].args.p_bucket).toBe("github")
  })

  it("502 when the rate limit check fails", async () => {
    const { res, fetch } = await run(
      { url: "https://github.com/octo/app" },
      { rpc: () => ({ data: null, error: { message: "db down" } }) }
    )
    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({ error: "Rate limit check failed" })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("quick mode returns repo metadata and combined code", async () => {
    const { res } = await run({ url: "https://github.com/octo/app" })
    expect(res.statusCode).toBe(200)
    expect(res.body.repo).toEqual({
      name: "octo/app",
      description: "demo",
      language: "JavaScript",
      stars: 7,
      url: "https://github.com/octo/app",
    })
    expect(res.body.files).toEqual(expect.arrayContaining(["package.json", "src/index.js", "src/util.js"]))
    expect(res.body.files).not.toContain("README.md")
    expect(res.body.fileCount).toBe(res.body.files.length)
    expect(res.body.code).toContain("// === src/index.js ===\ncontent of src/index.js")
    expect(res.body.totalLines).toBe(res.body.code.split("\n").length)
  })

  it("picked mode only fetches the requested files", async () => {
    const { res } = await run({ url: "https://github.com/octo/app", files: ["src/util.js"] })
    expect(res.body.files).toEqual(["src/util.js"])
  })

  it("list mode returns file objects with autoSelected", async () => {
    const { res } = await run({ url: "https://github.com/octo/app", mode: "list" })
    expect(res.statusCode).toBe(200)
    expect(res.body.fileCount).toBe(res.body.files.length)
    expect(res.body.files[0]).toEqual({ path: expect.any(String), size: expect.any(Number), autoSelected: true })
  })

  it("sends the GitHub token when configured and never leaks it", async () => {
    const { res, fetch } = await run({ url: "https://github.com/octo/app" }, { env: { GITHUB_TOKEN: "ghp_secret" } })
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer ghp_secret")
    expect(JSON.stringify(res.body)).not.toMatch(/ghp_secret/)
  })

  it("encodes file paths so they cannot rewrite the API path", async () => {
    const tree = [{ type: "blob", path: "src/a b#?.js", size: 10 }]
    const { fetch } = await run({ url: "https://github.com/octo/app" }, { fetchImpl: githubFetch({ tree }) })
    const contentsCall = fetch.mock.calls.map(([u]) => u).find((u) => u.includes("/contents/"))
    expect(contentsCall).toBe("https://api.github.com/repos/octo/app/contents/src/a%20b%23%3F.js")
  })

  describe("404 and upstream errors", () => {
    it("404 for an empty repository", async () => {
      const { res } = await run({ url: "https://github.com/octo/app" }, { fetchImpl: githubFetch({ tree: [] }) })
      expect(res.statusCode).toBe(404)
      expect(res.body).toEqual({ error: "Repository appears to be empty." })
    })

    it("404 when nothing scannable is found", async () => {
      const tree = [{ type: "blob", path: "logo.png", size: 10 }]
      const { res } = await run({ url: "https://github.com/octo/app" }, { fetchImpl: githubFetch({ tree }) })
      expect(res.statusCode).toBe(404)
      expect(res.body).toEqual({ error: "No scannable source files found in this repo." })
    })

    it("404 when a single file cannot be read", async () => {
      const { res } = await run({ url: "https://github.com/octo/app/blob/main/missing.js" })
      expect(res.statusCode).toBe(404)
      expect(res.body).toEqual({ error: "Could not read the specified file." })
    })

    it("502 when GitHub reports the repo missing or private", async () => {
      const { res } = await run({ url: "https://github.com/octo/app" }, { fetchImpl: githubFetch({ missingRepo: true }) })
      expect(res.statusCode).toBe(502)
      expect(res.body).toEqual({ error: "Repository not found or is private." })
    })
  })
})
