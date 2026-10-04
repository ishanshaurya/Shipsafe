import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const SRC = new URL("..", import.meta.url).pathname

// Modules allowed to call fetch("/api/..."). Every one attaches the session token.
// Add a path here only on purpose: a page that calls the API directly ships without auth and gets a 401.
const API_CALLERS = [
  "features/scan/scanService.js",
  "features/scan/scanRun.js",
  "features/scan/scanHistory.js",
  "features/github-import/githubImport.js",
  "features/regulations/regulationsService.js",
]

// Modules allowed to touch the Supabase client. Pages and components never do.
const SUPABASE_USERS = [
  "shared/supabaseClient.js",
  "shared/authHeader.js",
  "features/scan/scanHistory.js",
  "features/reports/reportService.js",
  "features/auth/authService.js",
]

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(jsx?|tsx?)$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })
}

// Demo code samples live in template strings and may contain fetch("/api/...") text.
// Strip them, except a template used directly as fetch's first argument.
const withoutSampleStrings = (text) => text.replace(/(?<!fetch\(\s*)`[^`]*`/g, "")

const offenders = (pattern, allowed) =>
  sourceFiles(SRC)
    .map((file) => ({ rel: relative(SRC, file), text: withoutSampleStrings(readFileSync(file, "utf8")) }))
    .filter(({ rel, text }) => pattern.test(text) && !allowed.includes(rel))
    .map(({ rel }) => rel)

describe("architecture boundaries", () => {
  it("only the listed modules call /api/*", () => {
    expect(offenders(/fetch\(\s*["'`]\/api\//, API_CALLERS)).toEqual([])
  })

  it("only the listed modules import the Supabase client", () => {
    expect(offenders(/supabaseClient|@supabase\/supabase-js/, SUPABASE_USERS)).toEqual([])
  })

  it("keeps every source file under 400 lines", () => {
    const long = sourceFiles(SRC)
      .filter((file) => readFileSync(file, "utf8").split("\n").length > 400)
      .map((file) => relative(SRC, file))
    expect(long).toEqual([])
  })
})
