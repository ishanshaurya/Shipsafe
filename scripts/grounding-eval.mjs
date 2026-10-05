#!/usr/bin/env node
// Offline scorer for Regulations answers. No network, no keys.
// Usage: node scripts/grounding-eval.mjs <responses-dir> [--json] [--strict] [--min-coverage N] [--max-hallucinations N]
// <responses-dir> holds saved fetchRegulations results named <question-id>.json (or <question-id>.<run>.json).
// Metrics are defined in docs/redesign/grounding-eval.md.
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { basename, join } from 'node:path'

const FIXTURES = fileURLToPath(new URL('../tests/fixtures/regulations/', import.meta.url))

export function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Whole-word containment on normalized text, so "ada" does not match "canada".
function hasAlias(name, aliases) {
  const hay = ` ${normalize(name)} `
  return aliases.some((a) => hay.includes(` ${normalize(a)} `))
}

function allText(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => allText(v, out))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!k.endsWith('_url')) allText(v, out)
  }
  return out
}

function isHttpUrl(s) {
  try {
    return ['http:', 'https:'].includes(new URL(s).protocol)
  } catch {
    return false
  }
}

export function loadFixtures(dir = FIXTURES) {
  const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))
  return { questions: read('questions.json').questions, registry: read('known-regulations.json').regulations }
}

// Scores one saved response against one question. Pure function.
export function scoreResponse(question, response, registry) {
  const regs = Array.isArray(response?.regulations) ? response.regulations : null
  const malformed = regs === null
  const list = regs ?? []
  const names = list.map((r) => r?.name ?? '')

  const required = question.required.map((req) => ({
    name: req.name,
    found: names.some((n) => hasAlias(n, req.any_of)),
    needs_human_check: Boolean(req.needs_human_check),
  }))
  const found = required.filter((r) => r.found).length
  const confident = required.filter((r) => !r.needs_human_check)
  const confidentFound = confident.filter((r) => r.found).length

  // Names matching neither the registry nor this question's required aliases are suspects, not proven inventions.
  const questionAliases = question.required.flatMap((r) => r.any_of)
  const unlisted = names.filter(
    (n) => n && !registry.some((k) => hasAlias(n, k.aliases)) && !hasAlias(n, questionAliases),
  )

  const text = allText(response).join('\n')
  const forbiddenHits = question.forbidden
    .filter((f) => new RegExp(f.pattern, 'i').test(text))
    .map((f) => ({ pattern: f.pattern, reason: f.reason }))

  const cited = list.filter((r) => isHttpUrl(r?.source_url)).length
  const hallucinations = forbiddenHits.length + unlisted.length

  return {
    id: question.id,
    malformed,
    regulation_count: list.length,
    required,
    // A question with no required names (trap question) is vacuously covered.
    coverage: required.length ? found / required.length : 1,
    coverage_confident: confident.length ? confidentFound / confident.length : 1,
    forbidden_hits: forbiddenHits,
    unlisted,
    hallucinations,
    hallucination_free: hallucinations === 0,
    // An empty list makes no claims, so nothing is uncited; a malformed response scores 0.
    citation_rate: malformed ? 0 : list.length ? cited / list.length : 1,
    citation_present: !malformed && cited === list.length,
  }
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export function summarize(results) {
  const regs = results.reduce((n, r) => n + r.regulation_count, 0)
  const unlisted = results.reduce((n, r) => n + r.unlisted.length, 0)
  return {
    responses: results.length,
    malformed: results.filter((r) => r.malformed).length,
    coverage: mean(results.map((r) => r.coverage)),
    coverage_confident: mean(results.map((r) => r.coverage_confident)),
    fully_covered: mean(results.map((r) => (r.coverage === 1 ? 1 : 0))),
    forbidden_hits: results.reduce((n, r) => n + r.forbidden_hits.length, 0),
    unlisted_names: unlisted,
    unlisted_rate: regs ? unlisted / regs : 0,
    hallucination_free: mean(results.map((r) => (r.hallucination_free ? 1 : 0))),
    citation_rate: mean(results.map((r) => r.citation_rate)),
    citation_present: mean(results.map((r) => (r.citation_present ? 1 : 0))),
  }
}

export function scoreDir(dir, fixtures = loadFixtures()) {
  const byId = new Map(fixtures.questions.map((q) => [q.id, q]))
  const results = []
  const unknown = []
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const id = basename(file, '.json').split('.')[0]
    const question = byId.get(id)
    if (!question) {
      unknown.push(file)
      continue
    }
    let response
    try {
      response = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    } catch {
      response = null
    }
    results.push({ file, ...scoreResponse(question, response, fixtures.registry) })
  }
  const seen = new Set(results.map((r) => r.id))
  const missing = fixtures.questions.map((q) => q.id).filter((id) => !seen.has(id))
  return { results, summary: summarize(results), missing, unknown }
}

const pct = (x) => `${Math.round(x * 100)}%`

function printReport({ results, summary, missing, unknown }) {
  console.log('file'.padEnd(12), 'cov'.padStart(5), 'cov*'.padStart(5), 'cite'.padStart(5), 'forb'.padStart(5), 'unl'.padStart(4))
  for (const r of results) {
    console.log(
      r.file.padEnd(12),
      pct(r.coverage).padStart(5),
      pct(r.coverage_confident).padStart(5),
      pct(r.citation_rate).padStart(5),
      String(r.forbidden_hits.length).padStart(5),
      String(r.unlisted.length).padStart(4),
      r.malformed ? ' MALFORMED' : '',
    )
    for (const q of r.required.filter((x) => !x.found)) console.log(`  missing: ${q.name}${q.needs_human_check ? ' (needs human check)' : ''}`)
    for (const h of r.forbidden_hits) console.log(`  forbidden: ${h.reason}`)
    for (const n of r.unlisted) console.log(`  unlisted (human check): ${n}`)
  }
  console.log('\nSummary (cov* = excluding required names that need human check)')
  const counts = new Set(['responses', 'malformed', 'forbidden_hits', 'unlisted_names'])
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k.padEnd(20)} ${counts.has(k) ? v : pct(v)}`)
  if (missing.length) console.log(`\nNo response for: ${missing.join(', ')}`)
  if (unknown.length) console.log(`Ignored files (no matching question): ${unknown.join(', ')}`)
}

function main(argv) {
  const args = argv.slice(2)
  const opt = (name) => {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : undefined
  }
  const dir = args.find((a, i) => !a.startsWith('--') && !['--min-coverage', '--max-hallucinations'].includes(args[i - 1]))
  if (!dir) {
    console.error('usage: node scripts/grounding-eval.mjs <responses-dir> [--json] [--strict] [--min-coverage N] [--max-hallucinations N]')
    return 2
  }
  const report = scoreDir(dir)
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2))
  else printReport(report)

  let failed = false
  const { summary, missing } = report
  if (args.includes('--strict') && (missing.length || summary.malformed)) failed = true
  const minCov = opt('--min-coverage')
  if (minCov !== undefined && summary.coverage < Number(minCov)) failed = true
  const maxH = opt('--max-hallucinations')
  if (maxH !== undefined && summary.forbidden_hits + summary.unlisted_names > Number(maxH)) failed = true
  return failed ? 1 : 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv)
