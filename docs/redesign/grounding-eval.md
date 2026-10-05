# Grounding eval (baseline design)

Regulations search (`regulationsService.fetchRegulations`) answers from the model alone. Before grounding is built (Wave 4, lane B), we need a baseline that shows what is wrong today and a fixed yardstick to show grounding helps. This doc defines that yardstick. It needs no network and no keys.

Scope: Regulations answers. Loophole Finder has a different output shape (loopholes, not a regulation list) and is **not scored yet**; once grounded, add a second fixture set and a small adapter in the scorer.

## Pieces

| File | Purpose |
|---|---|
| `tests/fixtures/regulations/questions.json` | 20 questions: topic string, required regulation names, forbidden claims |
| `tests/fixtures/regulations/known-regulations.json` | 82 real laws and standards, used only to spot unfamiliar names |
| `tests/fixtures/regulations/samples/{good,bad}/` | Hand-written responses that show what the scorer rewards and catches |
| `scripts/grounding-eval.mjs` | Offline scorer and CLI |
| `scripts/grounding-eval.test.js` | Unit tests (run by `npm test`) |

## Questions

20 topics across the EU, US (federal, state, city), UK, Canada, Brazil, India, China, Japan, South Korea, Singapore, Australia and global standards, and across sectors (general privacy, health, finance, children, hiring, AI, cybersecurity, payments, media). `q19` is a trap: no specific law exists, so any invented act is a hallucination.

Each question:

```json
{
  "id": "q02",
  "topic": "GDPR obligations for a US startup with EU users",
  "required": [{ "name": "GDPR", "any_of": ["gdpr", "general data protection regulation"] }],
  "forbidden": [{ "pattern": "GDPR[^.]{0,120}\\b10 ?%", "reason": "GDPR maximum fine is EUR 20M or 4% of worldwide turnover" }]
}
```

- `topic` is passed to `fetchRegulations` unchanged.
- `required[].any_of` are aliases; matching is case-, accent- and punctuation-insensitive, whole word.
- `forbidden[].pattern` is a case-insensitive regex run over every text field of the response (not `*_url` fields). Patterns stay inside one sentence (`[^.]`) to limit false hits.
- `needs_human_check: true` on a required name means the expectation is plausible but not certain.

### Needs human check

- `q16` TAKE IT DOWN Act: confident it exists (US, 2025); verify scope and status.
- `q17` Colorado AI Act: existence certain; effective date was delayed, verify.
- `q18` AI Basic Act (South Korea): passed Dec 2024 with a 2026 start; verify.

Everything else is from the author's knowledge, not checked against live sources. **A lawyer or the owner should review the fixtures once before they are treated as ground truth.** Where a question is only "required name present", being wrong costs little; the forbidden claims are the riskier part, so each one states its reason.

## Metrics

Per saved response (`<question-id>.json`, the object `fetchRegulations` returns):

| Metric | Definition |
|---|---|
| **coverage** | Required names found / required names. A name counts when a listed regulation's `name` matches any alias. Trap questions (no required names) score 1. |
| **coverage_confident** | Same, excluding names marked `needs_human_check`. Use this for pass/fail; use `coverage` for the full picture. |
| **forbidden_hits** | Forbidden claims whose pattern matches anywhere in the response text. |
| **unlisted** | Listed regulation names that match neither `known-regulations.json` nor the question's required aliases. These are suspects for invention, **not proof**: add a name to the registry after verifying it is real. |
| **hallucination** | `forbidden_hits + unlisted` for the response. `hallucination_free` = it is 0. |
| **citation_rate** | Share of listed regulations with a valid `http(s)` `source_url`. `citation_present` = rate is 1. An empty list is vacuously cited; a malformed response scores 0. |

Aggregates: mean coverage, mean coverage_confident, share fully covered, total forbidden hits, unlisted names and rate, share hallucination-free, mean citation rate, share citation-present.

### Known limits

- Presence of a URL is not correctness of the URL. Offline we cannot tell a real EUR-Lex link from a plausible fake. Grounded answers should cite URLs from the retrieved `regulations` rows; check that against the table in the grounded run.
- Alias matching is by words, so a "UK GDPR" entry also satisfies the required alias `gdpr` (noted on `q02`).
- Forbidden patterns catch known-wrong phrasings only. They cannot find a new wrong claim; the unlisted check and human spot checks cover that.
- A correct but unfamiliar regulation (not in the registry) shows as unlisted. Triage unlisted names by hand and grow the registry.
- Model output varies run to run.

## Running it

Score a directory of saved responses:

```
node scripts/grounding-eval.mjs <dir>                       # table + summary
node scripts/grounding-eval.mjs <dir> --json                # machine-readable
node scripts/grounding-eval.mjs <dir> --strict              # exit 1 if any question has no response or a malformed one
node scripts/grounding-eval.mjs <dir> --min-coverage 0.9    # exit 1 below threshold
node scripts/grounding-eval.mjs <dir> --max-hallucinations 0
```

Files are `<id>.json`; extra runs of the same question are `<id>.2.json`, `<id>.3.json` and are scored separately and averaged. Questions without a file are listed, not counted. Try it on the samples:

```
node scripts/grounding-eval.mjs tests/fixtures/regulations/samples/good
node scripts/grounding-eval.mjs tests/fixtures/regulations/samples/bad
```

## Collecting the baseline (needs the owner, not done in 4a)

1. Pick a model and provider config; record it, plus the date and commit, next to the results.
2. For each question, call `fetchRegulations(topic)` signed in (Regulations page, or `POST /api/gemini` with `{ tool: "regulations", userPrompt }` using the exact prompt in `regulationsService.js` and a bearer token from your session). Do not put the token in files or scripts.
3. Save the returned JSON as `<id>.json`. Run each question 3 times (`<id>.2.json`, `<id>.3.json`) because output varies.
4. Keep run directories **outside the repo** (or untracked); commit only the summary numbers.
5. Score with the CLI. Triage `unlisted` names by hand: real ones go into `known-regulations.json`, invented ones stay as the baseline hallucination count.
6. After grounding ships, repeat with the same questions, same runs, same settings, then compare.

Note: the app falls back to a flagged mock result when the AI call fails (`mockRegulationResult`). Make sure saved baselines are real model answers, not the mock (it is a "Deepfakes" sample with fixed content).

## Proposed success criteria for grounding (suggestions, owner decides)

- Coverage_confident at least the baseline, and 0.9 or higher.
- Hallucination-free on at least 95% of responses; zero forbidden hits.
- Citation present on 100% of responses, with every URL taken from retrieved rows.
- Trap question `q19` returns no invented law.

## Extending

- New question: add to `questions.json` with a unique id; every required alias must also be a real entry in `known-regulations.json` (a unit test enforces this).
- New wrong claim: add a `forbidden` entry with a reason; keep it within one sentence.
- Loophole Finder: add fixtures and an adapter once its grounded output shape is decided.
