import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const SRC = new URL("..", import.meta.url).pathname
const ALLOWED_DIR = join(SRC, "services")

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

// Every /api/* call must go through a service so it carries the session token.
// A page that calls fetch("/api/...") directly ships without auth and gets a 401.
describe("API boundary", () => {
  it("only src/services calls /api/* directly", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !file.startsWith(ALLOWED_DIR))
      .filter((file) => /fetch\(\s*["'`]\/api\//.test(withoutSampleStrings(readFileSync(file, "utf8"))))
      .map((file) => file.replace(SRC, "src/"))
    expect(offenders).toEqual([])
  })
})
