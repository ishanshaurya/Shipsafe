import { expect, vi } from "vitest"

export const USER = { id: "user-1", email: "victim@example.com" }
export const GOOD_TOKEN = "good-token"
export const SERVICE_KEY = "service-key"

const ENV_DEFAULTS = {
  SUPABASE_URL: "http://supabase.test",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE: "",
  GEMINI_API_KEY: "",
  GROQ_API_KEY: "",
  CEREBRAS_API_KEY: "",
  SAMBANOVA_API_KEY: "",
  GITHUB_TOKEN: "",
}

// A fake supabase-js: every createClient call is recorded so tests can tell
// the caller-scoped client (anon key + user JWT header) from the service one.
function makeSupabase({ rpc, updateResult = { error: null } }) {
  const state = { clients: [], rpcCalls: [], updates: [] }
  const createClient = (url, key, opts) => {
    const client = {
      key,
      opts,
      auth: {
        getUser: async (token) =>
          token === GOOD_TOKEN
            ? { data: { user: USER }, error: null }
            : { data: { user: null }, error: { message: "invalid jwt" } },
      },
      rpc: async (name, args) => {
        state.rpcCalls.push({ client, name, args })
        return rpc(name, args)
      },
      from: (table) => ({
        update: (values) => {
          const filters = []
          const query = {
            eq: (column, value) => {
              filters.push([column, value])
              return query
            },
            then: (resolve, reject) => {
              state.updates.push({ client, table, values, filters })
              return Promise.resolve(updateResult).then(resolve, reject)
            },
          }
          return query
        },
      }),
    }
    state.clients.push(client)
    return client
  }
  return { createClient, state }
}

export function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    chunks: [],
    body: undefined,
    headersSent: false,
    ended: false,
    setHeader(k, v) {
      this.headers[k] = v
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      this.headersSent = true
      this.ended = true
      return this
    },
    write(chunk) {
      this.headersSent = true
      this.chunks.push(chunk)
      return true
    },
    end() {
      this.ended = true
      return this
    },
  }
}

// Runs a fresh copy of api/<route>.js (module state such as provider
// cooldowns is reset every call) against fake Supabase, env and fetch.
// `rpc` defaults to "this is the user's first request in the window".
export async function callRoute(
  route,
  { body, token = GOOD_TOKEN, method = "POST", headers = {}, env = {}, fetchImpl, rpc = () => ({ data: 1, error: null }), updateResult } = {}
) {
  vi.resetModules()
  const logs = []
  vi.spyOn(console, "error").mockImplementation((...args) => logs.push({ stream: "error", args }))
  vi.spyOn(console, "log").mockImplementation((...args) => logs.push({ stream: "log", args }))

  const sb = makeSupabase({ rpc, updateResult })
  vi.doMock("@supabase/supabase-js", () => ({ createClient: sb.createClient }))
  for (const [k, v] of Object.entries({ ...ENV_DEFAULTS, ...env })) vi.stubEnv(k, v)
  const fetchMock = vi.fn(fetchImpl || (async () => new Response("unexpected fetch", { status: 500 })))
  vi.stubGlobal("fetch", fetchMock)

  const req = { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body }
  const res = mockRes()
  const { default: handler } = await import(`../../api/${route}.js`)
  await handler(req, res)
  return { res, state: sb.state, fetch: fetchMock, logs }
}

// Every console line must be one string holding one JSON object.
export function requestLines(logs) {
  return logs.map(({ args }) => {
    expect(args).toHaveLength(1)
    expect(typeof args[0]).toBe("string")
    return JSON.parse(args[0])
  })
}

export function resetHarness() {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.doUnmock("@supabase/supabase-js")
  vi.restoreAllMocks()
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })

// SSE body delivered as the given raw pieces, to exercise line buffering.
export function sseResponse(...pieces) {
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const p of pieces) controller.enqueue(enc.encode(p))
      controller.close()
    },
  })
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } })
}

export const geminiText = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] })
export const chatText = (content) => ({ choices: [{ message: { content } }] })

export const embedding = (n = 768) => Array.from({ length: n }, (_, i) => i / 1000)

const b64 = (s) => btoa(s)

// Minimal GitHub API: one repo with a tree and file contents.
export function githubFetch({ tree, repo = {}, missingRepo = false } = {}) {
  const treeItems = tree ?? [
    { type: "blob", path: "package.json", size: 100 },
    { type: "blob", path: "src/index.js", size: 200 },
    { type: "blob", path: "src/util.js", size: 50 },
    { type: "blob", path: "README.md", size: 10 },
  ]
  return async (url) => {
    const path = new URL(url).pathname
    if (missingRepo) return json({ message: "Not Found" }, 404)
    if (path === "/repos/octo/app") {
      return json({
        full_name: "octo/app",
        description: "demo",
        language: "JavaScript",
        stargazers_count: 7,
        html_url: "https://github.com/octo/app",
        default_branch: "main",
        ...repo,
      })
    }
    if (path.startsWith("/repos/octo/app/git/trees/")) return json({ tree: treeItems })
    if (path.endsWith("/missing.js")) return json({ message: "Not Found" }, 404)
    if (path.startsWith("/repos/octo/app/contents/")) {
      return json({ encoding: "base64", content: b64(`content of ${decodeURIComponent(path.split("/contents/")[1])}`) })
    }
    return json({ message: "Not Found" }, 404)
  }
}
