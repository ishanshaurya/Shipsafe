# Regulations table review (Wave 4, phase 4a)

Date: 2026-10-06. Reviewer: lane B. Input: `docs/redesign/regulations-export.csv` (14 rows, excluded from git). Schema: `supabase/migrations/0005_regulations.sql`. App side read: `src/features/regulations/regulationsService.js`, the `regulations` prompt in `api/gemini.js`.

**Verdict: FAIL** as a grounding source today. Three rows state a wrong legal status, 11 of 14 rows have at least one material error or unverifiable claim, and 8 of 14 have no source URL. Details and the path to a re-review are at the end.

How claims were checked. Tags used below:
- **[V]** checked against a source during this review (secondary sources, listed at the bottom; none is a primary legal text, so primary verification is part of any cleanup).
- **[M]** from my own knowledge, not re-checked. Treat as a lead, not a fact.
- **[U]** uncertain or unverifiable. Not counted as an error in the criteria below unless noted.
- **[measured]** observed directly (CSV statistics, HTTP requests made today).

Not done: no live comparison of the grounded rows against the model's answers (no provider keys in this lane), no primary-source reading.

## PASS criteria

Written to match what the app already asks of the AI: only real regulations, actionable and testable checklist items, a `source_url`, honest `status`.

| # | Criterion | PASS threshold |
|---|---|---|
| C1 | Legal status | No row with a wrong or superseded `status`. **Hard fail:** a wrong status inverts the advice (a revoked order shown as binding). |
| C2 | Facts | At least 90% of rows (13 of 14) with no material error in year, penalties or requirements. |
| C3 | Citations | At least 90% of rows with an `https` `source_url` that resolves and points at the named instrument or its official page. |
| C4 | Freshness | Every row verified within 180 days, and a per-row verification date exists. |
| C5 | Usable content | Summary of at least one full sentence; at least 3 requirements; at least 80% of rows with actionable, testable requirements (the prompt's own rule), not principle labels. |
| C6 | Integrity | No duplicate keys, no nulls in `name`, `country`, `status`. |
| C7 | Coverage | Grounding must not lose answers the ungrounded model gives, either because coverage is broad enough or because a defined fallback covers the gap. |

Verdict rule:
- **PASS**: all seven met.
- **PASS WITH CLEANUP**: C1 and C6 met, every other failure fixable by editing existing rows in about one editor-day, and no more than 30% of rows affected.
- **FAIL**: anything else.

## Inventory [measured]

- **Rows:** 14. IDs unique, (country, name) unique.
- **Rows per `country` value:** India 3, United States 2, and one each for Australia, Brazil, Canada, China, European Union, Japan, Singapore, South Korea, United Kingdom. That is 11 distinct values; "European Union" is a bloc, not a country, so it is 10 countries plus the EU.
- **`status`:** Active 8, Enacted 3, Proposed 3. **`dev_impact`:** high 5, critical 3, medium 3, low 3. **`sector`:** Cross-sector 12, Technology 2. **`regulation_type`:** 8 distinct values across 14 rows.
- **`year`:** 2023 on 10 rows, 2024 on 4 rows, nothing else. Ten rows on one year is itself a flag (see the row review: at least four of those 2023 values are wrong).
- **Timestamps:** `created_at` and `updated_at` are identical on all 14 rows (`2026-03-11 03:05:51.787566+00`): one bulk insert, never edited. Age on 2026-10-06 is 208 days.
- **Summaries:** 109-172 characters (median 135), one or two sentences each.
- **Requirements:** 4 items on 13 rows, 3 on one. Items are 8-54 characters (median 29), mostly labels such as "Fairness", "Human-centered values", "Safety & security".
- **`source_url`:** present on 6 rows, missing on 8 (Australia, Brazil, Canada, China, Japan, Singapore, South Korea, United Kingdom).

### `source_url` check [measured, requests made 2026-10-06]

| Row | URL | Result |
|---|---|---|
| EU AI Act | `https://artificialintelligenceact.eu/` | 200, unofficial tracker site, not the Official Journal text |
| DPDP Act 2023 | `https://meity.gov.in/data-protection-framework` | 200 (redirects to `www.`), generic page, not the Act |
| IndiaAI Mission | `https://indiaai.gov.in/` | 200, portal root, not the Mission document |
| MeitY advisory | `https://meity.gov.in/` | 200, ministry root only |
| NIST AI RMF | `https://nist.gov/artificial-intelligence` | 200 but redirects to `https://www.nist.gov/super-intelligence`, which is not the RMF page |
| US Executive Order | `https://whitehouse.gov/ai/` | **404** |

All six are well-formed `https`; five resolve; one is dead; at most three point at the right kind of page, none at the instrument itself.

### Duplicates and overlap

No duplicates. India (DPDP, IndiaAI, MeitY) and US (NIST, Executive Order) are distinct instruments. The NIST row and the Executive Order row reference each other, so a topic query will return both.

### Schema versus what the app expects

These are not data errors but they matter for any grounding design:
- `status` uses `Enacted`, but the client prompt and parsing use `Active | Draft | Proposed | Repealed | Unknown`. "Enacted" is not in the client's vocabulary, and the table has no way to say "revoked" or "lapsed" without a new value.
- `dev_impact` is `low/medium/high/critical`; the client's `risk.severity` is `High/Medium/Low`.
- No column for `who_is_at_risk` or per-row topics. `sector` is "Cross-sector" on 12 of 14 rows, so it cannot filter by topic (healthcare, hiring, biometrics).
- `year` mixes meanings (introduction, adoption, first publication).
- No `last_verified_at`.

## Row review (all 14)

Rows are ordered as in the export. "FIX" means at least one material error; "UNVERIFIABLE" means key claims I could not support.

| # | Row | Verdict | What is wrong or unverified |
|---|---|---|---|
| 1 | Australia AI Ethics Framework (2023, Active) | FIX | Year: the 8 AI Ethics Principles date from 2019 **[M]**. The summary says the government is consulting on mandatory guardrails; the government paused them and published the National AI Plan on 2 Dec 2025, dropping the plan for mandatory guardrails **[V]**. Requirements list 4 of the 8 principles **[M]**. No URL. |
| 2 | Brazil AI Bill PL 2338/2023 (2024, Proposed) | FIX / uncertain | The Senate passed it in Dec 2024 and it sat in the Chamber of Deputies; I did not check where it stands in Oct 2026 **[M, U]**. The penalty omits the per-infraction cap (about R$50M alongside 2% of revenue) **[M]**. "LGPD alignment" is not a requirement a developer can test. Year mixes bill year (2023) and Senate vote (2024). No URL. |
| 3 | AIDA (Bill C-27) (2023, Proposed) | FIX | **Status wrong.** Bill C-27 died on the Order Paper when Parliament was prorogued on 6 Jan 2025, and the AI minister has said AIDA will not return as drafted **[V]**. Penalty text blends criminal and administrative tiers (the bill had up to CA$25M or 5% for offences and CA$10M or 3% for administrative penalties) **[M]**. The bill was introduced in 2022 **[M]**. No URL. |
| 4 | China Generative AI Regulations (2023, Enacted) | FIX / uncertain | Enacted status is right: Interim Measures effective 15 Aug 2023 **[M]**. The "fines up to ¥100K" figure matches the April 2023 draft, not the final measures, which defer to existing laws **[M, U]**. "CAC registration mandatory" is overstated: filing applies to services with public opinion attributes **[M]**. Later rules (AI content labelling measures, Cybersecurity Law amendments) are absent **[M, U]**. No URL. |
| 5 | EU AI Act (2024, Enacted) | OK, stale dates | Status and year are right **[M]**. The penalty shows only the top tier (EUR 35M / 7%); lower tiers are 15M / 3% and 7.5M / 1% **[M]**. High-risk dates moved: the Council adopted the Digital Omnibus on AI on 29 Jun 2026, pushing Annex III obligations to 2 Dec 2027 and Annex I to 2 Aug 2028 **[V]**. The row has no dates, so a grounded answer cannot say what applies when. |
| 6 | India DPDP Act 2023 (2023, Enacted) | FIX | **"Data localisation for sensitive personal data" is wrong:** the Act has no sensitive-data category and no blanket localisation rule; the government may restrict transfers to notified countries **[V]**. "Enacted" omits that the Rules were notified 14 Nov 2025 and most obligations apply 18 months later, around May 2027 **[V]**. The ₹250 crore maximum is right **[M]**. URL is a generic page. |
| 7 | IndiaAI Mission / National AI Strategy (2023, Active) | UNVERIFIABLE | Year: NITI Aayog's strategy is from 2018 and the Mission was approved in 2024 **[M]**. "IndiaAI compute access requires ethical AI declaration", "Govt procurement must follow NITI Aayog guidelines" and "ineligibility for IndiaAI funding if non-compliant" are not claims I can support **[U]**. URL is the portal root. |
| 8 | MeitY AI Advisory & Deepfake Rules (2024, Active) | FIX | The name suggests rules; these are advisories. "Explicit approval before deploying untested AI" is from the 1 Mar 2024 advisory, withdrawn in the revised 15 Mar 2024 advisory **[V]**. "Mandatory bias testing", "consent required for AI training data" and "visible watermarks" go beyond the advisory text as I know it **[M, U]**. Later IT Rules changes on synthetic content were not confirmed either way **[U]**. URL is the ministry root. |
| 9 | Japan AI Guidelines (2023, Active) | FIX | Year: the AI Guidelines for Business are from 2024 **[M]**. The row misses the AI Promotion Act (passed 28 May 2025, promulgated 4 Jun 2025) **[V]**. No URL. |
| 10 | Singapore Model AI Governance Framework (2023, Active) | FIX | Year: first edition 2019, second 2020, generative AI framework 2024 **[M]**. Content otherwise reasonable. No URL. |
| 11 | Korea AI Act (2024, Proposed) | FIX | **Status wrong.** The AI Basic Act took effect on 22 Jan 2026, with administrative fines up to KRW 30M and a stated one-year grace period before fines **[V]**. Penalties show "TBD". "Penalties for deepfake misuse" is not a requirement. No URL. |
| 12 | UK AI Regulatory Framework (2023, Active) | OK | Accurate in substance; lists 4 of the 5 principles (fairness missing) **[M]**. No URL. |
| 13 | NIST AI RMF (2023, Active) | OK, URL FIX | Content is right (four functions, voluntary) **[M]**. "De facto standard for federal AI procurement" is overstated **[M]**. URL redirects to an unrelated page **[measured]**. |
| 14 | US Executive Order on AI Safety (2023, Active) | FIX, remove | **Status wrong.** EO 14110 was revoked on 20 Jan 2025 by EO 14148 **[V]**. Every requirement in the row (red-team reporting, watermarking standards) comes from the revoked order. URL is a 404 **[measured]**. |

Summary: clean enough as-is: rows 5, 12, 13 (three, with minor notes). Row 2 is uncertain. The other eleven have a material error or an unsupported claim (Brazil and China only on points I mark uncertain). The errors were already present at load time: the loaded rows predate or ignore events from Jan 2025 (Canada, US order), Nov 2025 (DPDP Rules), Dec 2025 (Australia) and Jan 2026 (Korea), all earlier than the 11 Mar 2026 insert. So this is not drift; the source was stale or model-seeded. I cannot tell which.

## Results against the criteria

| # | Result | Evidence |
|---|---|---|
| C1 Status | **FAIL** | 3 rows hard-wrong (Canada, US order, Korea); 2 more stale (EU dates, MeitY superseded text). |
| C2 Facts | **FAIL** | About 3 of 14 clean (21%) against 90% required. |
| C3 Citations | **FAIL** | 8 of 14 missing; of 6 present, 1 dead, 1 redirects to an unrelated page, 2 are site roots. |
| C4 Freshness | **FAIL** | 208 days since the one bulk load; no verification date field. |
| C5 Content | **FAIL** | Summaries fine. About 6 of 14 rows are principle labels, not testable items (Australia, Japan, UK, NIST, Singapore, IndiaAI), so about 57% actionable against 80%. |
| C6 Integrity | PASS | No duplicates or nulls except `source_url`. |
| C7 Coverage | FAIL as a sole source | See below. |

## Coverage: would grounding narrow answers?

Yes, and for the questions that matter most.
- **Thin by design.** 14 instruments over 11 jurisdictions. Within those jurisdictions, binding or recent rules are missing: Japan's AI Promotion Act **[V]**, US state laws such as Colorado and California **[M]**, China's labelling rules **[M, U]**, EU rules beyond the AI Act. Not covered at all: Italy, Vietnam, the Gulf states, Switzerland and others **[M, U]**.
- **No topic axis.** The app is a topic search ("Topic: ..." in `regulationsService`). With 12 of 14 rows "Cross-sector" there is nothing to match a topic like healthcare, hiring, biometrics, chatbot disclosure or training-data copyright. A strict "answer only from the table" mode would often return nothing, where the ungrounded model returns up to 4 plausible laws.
- **Worse on facts it matters.** The three clearest errors (revoked order, died bill, enacted Korean act) are facts the ungrounded model is likely to get right, since its prompt already says to omit what it is unsure of **[U: not tested here]**. Grounding on these rows would add a "from our database" authority label to wrong statements, which is worse than an unlabelled model answer.

How questions outside the table should be handled, once the table is fit for use: grounded rows first, labelled as verified with their source; for countries or laws not in the table, say so in the answer ("not in our verified set") and fall back to the ungrounded answer marked unverified; never present a model answer as database-backed and never return an empty result for a topic the model can answer. That design is deferred (see below).

## Verdict: FAIL

C1 is a hard fail (three wrong statuses), C2 to C5 and C7 also fail, and the failures touch 11 of 14 rows (79%), well above the 30% ceiling for PASS WITH CLEANUP. The data model (no verification date, status vocabulary mismatch, no topic tags) also needs changes, not only row edits. The grounding design sections were conditional on PASS or PASS WITH CLEANUP, so they are not written; Wave 4 should not start on this table.

### Path to a re-review

1. **Editorial pass on the 11 problem rows**, each claim tied to a primary source. At minimum: mark Canada lapsed, retire or replace the US order (current federal position is a separate question; EO 14179 and the 2025 AI Action Plan are leads **[M]**), update Korea to in force with fines and grace period, rewrite DPDP requirements and phase dates, correct MeitY to the revised advisory, fix the four wrong years, add the Japan AI Promotion Act, add dates to the EU row.
2. **Schema (needs a migration, not written here):** `last_verified_at` (required), required `source_url` pointing at the primary text, status vocabulary that can express `lapsed`/`revoked`, topic tags (array) so queries can match, and `who_is_at_risk` if the client keeps that field.
3. **Content standard:** requirements must be actionable and testable (the prompt's rule); no principle labels.
4. **Coverage:** agree a target list before re-review (at least the jurisdictions and instruments users actually ask about, including US state laws), and decide the fallback labelling above.
5. **Process:** a named owner and a review cadence (for example quarterly), because the first load was already stale when inserted.
6. Re-run this review against the same criteria. Loophole Finder grounding is a separate question: the table has penalties and requirements but no ambiguity or grey-area data, so it does not support that tool as it stands.

## Sources (secondary, used for the [V] tags)

- Korea: [Cooley overview of the AI Basic Act](https://www.cooley.com/news/insight/2026/2026-01-27-south-koreas-ai-basic-act-overview-and-key-takeaways), [South Korea launches AI laws (Reuters syndication)](https://www.timeslive.co.za/news/sci-tech/2026-01-22-south-korea-launches-landmark-laws-to-regulate-ai/)
- Canada: [Canada AI regulation 2026](https://compliancehub.wiki/canada-ai-regulation-2026-no-ai-act-what-actually-applies/), [Year in review 2025: Canadian digital policy](https://vlex.com/vid/year-in-review-2025-1101521044)
- US: [Hunton on the revocation of the AI executive order](https://www.hunton.com/privacy-and-cybersecurity-law-blog/the-impact-of-ai-executive-orders-revocation-remains-uncertain-but-new-trump-eo-points-to-path-forward), [House Document 119-28 (govinfo)](https://www.govinfo.gov/content/pkg/CDOC-119hdoc28/html/CDOC-119hdoc28.htm)
- India MeitY: [AZB on the revised 15 Mar 2024 advisory](https://www.azbpartners.com/bank/meity-liberalizes-ai-advisory-dated-march-1-2024-following-industry-concerns-and-issues-revised-advisory-on-march-15-2024/)
- India DPDP: [SCC Online on the DPDP Rules 2025](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/), [KS&K on cross-border transfers](https://ksandk.com/data-protection-and-data-privacy/cross-border-data-transfers-dpdp-act-india/)
- Japan: [IBA on Japan's AI legislation](https://www.ibanet.org/japan-emerging-framework-ai-legislation-guidelines)
- Australia: [Mallesons on the National AI Plan](https://www.mallesons.com/au/en/insights/latest-thinking/australias-ai-plan-where-is-australia-going-with-ai.html), [AdNews](https://www.adnews.com.au/news/australia-pauses-ai-guardrails-and-goes-with-a-national-plan)
- EU: [Winston & Taylor on the adopted AI Digital Omnibus](https://www.winstontaylor.com/insights/ai-act-rules-on-high-risk-ai-delayed-as-ai-digital-omnibus-agreed)
