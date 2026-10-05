# Cost and usage alerts

Notes for the owner. No keys here; env var names only. Dashboard layouts change, so treat the menu names as pointers and confirm in each console.

## What can spend money

| Service | Env var(s) | Spend risk |
|---|---|---|
| Gemini (Google AI) | `GEMINI_API_KEY` | Paid once the key is on a billing-enabled project; free tier is rate limited |
| Groq | `GROQ_API_KEY` | Free tier is rate limited; paid tier bills per token |
| Cerebras | `CEREBRAS_API_KEY` | Same pattern |
| SambaNova | `SAMBANOVA_API_KEY` | Same pattern |
| GitHub | `GITHUB_TOKEN` | No billing; a rate limit (authenticated REST: 5000 req/hour) that import shares across all users |
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE` | Plan quotas (DB size, egress, auth MAU, edge usage); overage on Pro |
| Vercel | project settings | Function invocations and duration, bandwidth, preview builds |

The provider pool in `api/gemini.js` fails over across Gemini, Groq, Cerebras and SambaNova, so one key running dry shows up as slower or failing scans, not a hard outage. A leaked key shows up as usage you did not generate.

## App-side brakes (already in code)

Per-user, Postgres-backed: `/api/gemini` 20 req/min, `/api/github` 15, `/api/embed` 60 (see `docs/redesign/CONTRACTS.md`). Every route needs a signed-in user. These cap one account, not the total across many accounts, so provider-side limits below matter.

## Alerts to set

1. **Gemini / Google Cloud**: create a budget with email alerts at 50%, 90% and 100% of a small monthly amount (Billing → Budgets & alerts). Alerts do not stop spending; to hard-stop, cap per-project API quota (APIs & Services → Quotas) or keep the key on a project without billing.
2. **Groq, Cerebras, SambaNova**: in each console set a usage or spend limit and notification email if offered; otherwise stay on the free tier and note the rate limits. Check the console monthly.
3. **GitHub token**: use a fine-grained read-only token for public data, set an expiry, and add a calendar reminder before it lapses. Watch for 403/429 from `/api/github` in logs.
4. **Supabase**: Project → Settings → Billing/Usage. Turn on the spend cap if the plan has one, and review usage after each launch. Watch DB size (`scan_history`, `reports`, `regulations` embeddings) and `rate_limits` growth.
5. **Vercel**: Team → Settings → Billing → Spend Management. Set a spend amount with notifications (and pause-on-limit if wanted). Review function duration for `/api/gemini`, the slowest route.

## Key hygiene

- Separate keys per environment (preview vs production) so a preview leak can be revoked alone.
- Rotate a key at once if it appears in a commit, log or screenshot. History already holds two gitleaks findings; see `docs/redesign/ci.md`.
- After rotating, update the value in Vercel (and GitHub secrets for CI) and run `scripts/health.sh <url>`.

## Signals worth checking after deploy

- Sudden rise in 502s from `/api/gemini` (all providers failing, often quota).
- 429s from many different users (limits too tight) vs one user (abuse working as intended).
- `scripts/health.sh` slow responses: times are printed per check.
