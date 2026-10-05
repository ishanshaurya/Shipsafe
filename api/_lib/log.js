import { createHmac, randomUUID } from "node:crypto"

// One JSON line per request. The line is built from an allow-list, never from
// request or response data: no prompts, code, tokens, keys, emails or bodies.
// Free-form values are limited to values this code picked (route, stage and
// provider names) or validated against a fixed set (action).

const ACTIONS = new Set([
  "debugger", "audit", "loopholes", "regulations", // /api/gemini tool
  "generate", "similar", "save", // /api/embed action
  "list", "import", // /api/github mode
])
const STAGE_FIELDS = new Set(["provider", "ok", "status", "attempt", "ttfbMs"])
const MAX_ERRORS = 5

// Salt is optional (LOG_HASH_SALT); without it the hash is still one-way.
const hashUserId = (id) =>
  createHmac("sha256", process.env.LOG_HASH_SALT || "shipsafe").update(String(id)).digest("hex").slice(0, 16)

const SAFE_ID = /^[A-Za-z0-9._:-]{1,64}$/
const SAFE_CODE = /^[A-Za-z0-9_-]{1,20}$/

const ms = (n) => Math.round(n * 10) / 10

export function createLog(req, route) {
  const start = performance.now()
  const headerId = req?.headers?.["x-vercel-id"]
  const requestId = typeof headerId === "string" && SAFE_ID.test(headerId) ? headerId : randomUUID()
  let userHash = null
  let action = null
  const stages = []
  const errors = []

  const log = {
    requestId,

    setUser(user) {
      userHash = user?.id ? hashUserId(user.id) : null
    },

    // Anything outside the known action names is recorded as "other".
    setAction(value) {
      action = ACTIONS.has(value) ? value : "other"
    },

    stage(name, durationMs, meta = {}) {
      const entry = { stage: name, ms: ms(durationMs) }
      for (const [k, v] of Object.entries(meta)) {
        if (!STAGE_FIELDS.has(k) || !["string", "number", "boolean"].includes(typeof v)) continue
        entry[k] = k === "ttfbMs" ? ms(v) : v
      }
      stages.push(entry)
    },

    // Times fn as a stage; ok is false if it throws.
    async time(name, fn, meta) {
      const t0 = performance.now()
      let ok = true
      try {
        return await fn()
      } catch (err) {
        ok = false
        throw err
      } finally {
        log.stage(name, performance.now() - t0, { ...meta, ok })
      }
    },

    // Only the error's class name, short code and numeric status: messages can
    // echo provider response bodies.
    error(where, err) {
      if (errors.length >= MAX_ERRORS) return
      const entry = { where }
      if (typeof err?.name === "string" && SAFE_CODE.test(err.name)) entry.name = err.name
      if (typeof err?.code === "string" && SAFE_CODE.test(err.code)) entry.code = err.code
      if (Number.isInteger(err?.status)) entry.status = err.status
      errors.push(entry)
    },

    finish(status) {
      const line = {
        ts: new Date().toISOString(),
        level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
        msg: "request",
        requestId,
        route,
        action,
        userHash,
        status,
        latencyMs: ms(performance.now() - start),
        stages,
      }
      if (errors.length) line.errors = errors
      ;(status >= 500 ? console.error : console.log)(JSON.stringify(line))
    },
  }
  return log
}

// Wraps a handler so every request, including thrown ones, emits one line.
export function withLog(route, handler) {
  return async function logged(req, res) {
    const log = createLog(req, route)
    try {
      return await handler(req, res, log)
    } catch (err) {
      res.statusCode = 500
      log.error("unhandled", err)
      throw err
    } finally {
      log.finish(res.statusCode)
    }
  }
}
