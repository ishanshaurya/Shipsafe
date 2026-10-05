# Frozen contracts

Lanes work in parallel, so these shapes are fixed. Change one only through the integrator (see PLAN.md, "Change requests"). Every lane tests against this file.

## Auth (all `/api/*` routes)
Header `Authorization: Bearer <supabase access_token>`. Missing or invalid: `401 {"error":"Sign in required"}`.

## POST /api/gemini
Request `{ tool: "debugger"|"audit"|"loopholes"|"regulations", userPrompt: string (<=300000 chars), stream?: boolean }`
- Non-stream `200 {content: string, provider: string}`
- Stream `200 text/event-stream`: lines `data: {"chunk": string}` then `data: [DONE]`
- Errors: `400 {"error"}` bad tool or prompt, `401`, `429 {"error"}` over 20 req/min/user, `500 {"error"}` rate-limit check failed or no provider configured, `502 {"error"}` all providers failed

## POST /api/github
Request `{ url: string, mode?: "list", files?: string[] }`
- Quick/picked `200 {repo:{name,description,language,stars,url}, files:string[], fileCount, totalLines, code}`
- List `200 {repo, files:[{path,size,autoSelected}], fileCount}`
- Errors: `400`, `401`, `404`, `429` (over 15 req/min/user, own bucket), `502` (all `{"error"}`). A failed rate-limit check returns `502`.

## POST /api/embed
Request `{ action: "generate", text } | { action: "similar", embedding: number[768], currentScanId?, limit? } | { action: "save", scanId, embedding: number[768] }`
- generate `200 {embedding}`, similar `200 {similar:[{...,similarity}]}`, save `200 {success:true}`
- Errors: `400`, `401`, `429` (over 60 req/min/user, own bucket), `502` (all `{"error"}`). A failed rate-limit check returns `502`.

## Client service surface (src/features, src/shared)
- `features/scan/scanService`: `callAI(tool,payload)`, `callAIStream(tool,payload,onChunk)` return `{content,error}`. Also `validate(tool,parsed)`, which dispatches to the tool module.
- Tool modules (`features/{debugger,audit,loopholes}/<tool>Tool.js`, registered in `features/scan/toolModules.js`): `{id, inputField, embedded?, buildPrompt, validate, normalize?, score, suggest}`. Audit and Loopholes also export `normalizeAuditResult` / `normalizeLoopholesResult`. Regulations has no tool module; `regulationsService` runs its own query.
- `features/scan/scanRun`: `runScan({tool,payload,user,stream,onChunk})` returns `{result,score,suggestions,error}`; `findSimilarScans(tool,result)` returns `[]` on any failure.
- `features/scan/scanHistory`: `saveScan`, `getScanHistory`, `attachEmbedding`, `embeddingText`.
- `features/regulations/regulationsService`: `fetchRegulations(topic)` returns the regulation result, or the mock result when the AI call fails.
- `features/github-import/githubImport`: `importRepo`, `listRepoFiles`, `fetchRepoFiles` return `{data,error,aborted?}` and never throw. `useRepoImport({onImported})` returns `{repoProps}` for `<RepoImport>`, including `onRetry` for the last import action.
- `features/reports/reportService`: `saveReport`, `getReportBySlug`.
- `features/auth/authService`: `signUp`, `signInWithPassword`, `signInWithGitHub`, `signOut`, `getCurrentUser`, `onAuthChange`.
- `shared/authHeader`: `authHeader()`.
- `shared/ui/*` (Button, Card, Field, Badge, Spinner, Skeleton, EmptyState, ErrorState, Notice, Progress) are presentation only; no network or Supabase access.
- Removed in Wave 2: `extractScore` (now each tool's `score`), `crossToolSuggestions.getSuggestions` (now each tool's `suggest`).
- Removed in A2 (no callers): `supabaseService` (split into the modules above), `getScanById`, `deleteScan`, `getRegulations`, `getRegulationById`, `getUserProfile`, `updateUserProfile`.

Only `scanService`, `scanRun`, `scanHistory`, `githubImport` and `regulationsService` call `/api/*`. Only `supabaseClient`, `authHeader`, `authService`, `scanHistory` and `reportService` touch the Supabase client. Pages never do either. `src/app/architecture.test.js` enforces both lists.

## Database objects the app relies on
Tables `scan_history` (incl. `embedding vector(768)`), `reports`, `regulations`, `rate_limits`. Functions `increment_rate_limit(timestamptz, text default 'gemini')`, `match_scans(...)`. RLS: users read and write only their own rows. `reports` rows with `is_public` are readable by anyone.
