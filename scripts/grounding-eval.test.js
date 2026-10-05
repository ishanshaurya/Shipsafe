import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { loadFixtures, normalize, scoreDir, scoreResponse, summarize } from './grounding-eval.mjs'

const { questions, registry } = loadFixtures()
const question = (id) => questions.find((q) => q.id === id)
const reg = (name, source_url = 'https://example.com/law', summary = 'Sample.') => ({ name, source_url, summary })
const answer = (...regulations) => ({ regulations })
const score = (id, response) => scoreResponse(question(id), response, registry)

describe('fixtures', () => {
  it('has 15 to 20 questions with unique ids and valid regexes', () => {
    expect(questions.length).toBeGreaterThanOrEqual(15)
    expect(questions.length).toBeLessThanOrEqual(20)
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length)
    for (const q of questions) for (const f of q.forbidden) expect(() => new RegExp(f.pattern, 'i')).not.toThrow()
  })

  it('every required alias is a known regulation, so a correct answer is never flagged unlisted', () => {
    for (const q of questions) {
      for (const r of q.required) {
        const response = answer(reg(r.name))
        expect(scoreResponse(q, response, registry).unlisted, `${q.id} ${r.name}`).toEqual([])
      }
    }
  })
})

describe('scoreResponse', () => {
  it('scores a good answer: full coverage, cited, no hallucination', () => {
    const r = score('q01', answer(reg('EU AI Act (Art. 50)'), reg('GDPR')))
    expect(r.coverage).toBe(1)
    expect(r.citation_present).toBe(true)
    expect(r.hallucination_free).toBe(true)
  })

  it('counts missing required names', () => {
    const r = score('q05', answer(reg('COPPA')))
    expect(r.coverage).toBe(0.5)
    expect(r.required.find((x) => !x.found).name).toBe('UK Age Appropriate Design Code')
  })

  it('accepts any alias, ignoring case, punctuation and accents', () => {
    expect(score('q06', answer(reg('Lei Geral de Proteção de Dados (LGPD)'))).coverage).toBe(1)
    expect(normalize('Protección—DE datos!')).toBe('proteccion de datos')
  })

  it('matches whole words only', () => {
    // "ada" is a registry alias; it must not match inside "Canada".
    const r = score('q10', answer(reg('Canada Widget Act')))
    expect(r.unlisted).toEqual(['Canada Widget Act'])
  })

  it('flags a forbidden claim found in any text field', () => {
    const r = score('q01', answer(reg('EU AI Act', 'https://example.com', 'The AI Act entered into force in 2021.')))
    expect(r.forbidden_hits).toHaveLength(1)
    expect(r.hallucination_free).toBe(false)
  })

  it('flags an invented regulation name as unlisted and not hallucination-free', () => {
    const r = score('q02', answer(reg('GDPR'), reg('Transatlantic Data Shield Act')))
    expect(r.unlisted).toEqual(['Transatlantic Data Shield Act'])
    expect(r.hallucinations).toBe(1)
  })

  it('handles the trap question: empty answer is clean, an invented act is not', () => {
    expect(score('q19', answer()).hallucination_free).toBe(true)
    const bad = score('q19', answer(reg('Antarctic Data Residency Act')))
    expect(bad.forbidden_hits).toHaveLength(1)
    expect(bad.unlisted).toHaveLength(1)
  })

  it('requires a valid http(s) source_url for citation', () => {
    expect(score('q03', answer(reg('CCPA', null))).citation_present).toBe(false)
    expect(score('q03', answer(reg('CCPA', 'javascript:alert(1)'))).citation_present).toBe(false)
    expect(score('q03', answer(reg('CCPA', 'https://oag.ca.gov/privacy/ccpa'))).citation_rate).toBe(1)
  })

  it('reports coverage without names that need human check', () => {
    const r = score('q16', answer(reg('EU AI Act'), reg('UK Online Safety Act')))
    expect(r.coverage).toBeCloseTo(2 / 3)
    expect(r.coverage_confident).toBe(1)
  })

  it('marks a response without a regulations array as malformed', () => {
    const r = score('q01', { error: 'boom' })
    expect(r.malformed).toBe(true)
    expect(r.coverage).toBe(0)
    expect(r.citation_present).toBe(false)
  })
})

describe('scoreDir on the hand-written samples', () => {
  const samples = (kind) => scoreDir(fileURLToPath(new URL(`../tests/fixtures/regulations/samples/${kind}/`, import.meta.url)))

  it('good samples are hallucination-free with full confident coverage', () => {
    const { summary } = samples('good')
    expect(summary.forbidden_hits).toBe(0)
    expect(summary.unlisted_names).toBe(0)
    expect(summary.coverage_confident).toBe(1)
  })

  it('bad samples are caught: hallucinations, lower coverage, missing citation', () => {
    const { summary, results } = samples('bad')
    expect(summary.forbidden_hits).toBe(3)
    expect(summary.unlisted_names).toBe(3)
    expect(summary.coverage).toBeLessThan(1)
    expect(summary.citation_rate).toBeLessThan(1)
    expect(results.every((r) => r.id !== 'q19' || !r.hallucination_free)).toBe(true)
  })

  it('good beats bad on every headline metric', () => {
    const good = samples('good').summary
    const bad = samples('bad').summary
    expect(good.hallucination_free).toBeGreaterThan(bad.hallucination_free)
    expect(good.coverage).toBeGreaterThan(bad.coverage)
    expect(good.citation_rate).toBeGreaterThan(bad.citation_rate)
  })
})

describe('summarize', () => {
  it('averages per-response scores', () => {
    const a = score('q01', answer(reg('EU AI Act'), reg('GDPR')))
    const b = score('q01', answer())
    expect(summarize([a, b]).coverage).toBe(0.5)
  })
})
