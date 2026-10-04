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
- Errors: `400`, `401`, `404`, `502` (all `{"error"}`)

## POST /api/embed
Request `{ action: "generate", text } | { action: "similar", embedding: number[768], currentScanId?, limit? } | { action: "save", scanId, embedding: number[768] }`
- generate `200 {embedding}`, similar `200 {similar:[{...,similarity}]}`, save `200 {success:true}`
- Errors: `400`, `401`, `502` (all `{"error"}`)

## Client service surface (src/services)
- `scanService`: `callAI(tool,payload)`, `callAIStream(tool,payload,onChunk)`, `fetchRegulations(topic)` return `{content,error}` or the regulation result.
- `scanRun`: `runScan({tool,payload,user,stream,onChunk})`, `findSimilarScans(tool,result)`.
- `githubImport`: `importRepo`, `listRepoFiles`, `fetchRepoFiles` return `{data,error,aborted?}`.
- `supabaseService`: `authHeader()`, `saveScan`, `getScanHistory`, `getScanById`, `deleteScan`, `saveReport`, `getReportBySlug`, `attachEmbedding`.
Only these modules call `/api/*` or Supabase. Pages never call `fetch("/api/...")` directly.

## Database objects the app relies on
Tables `scan_history` (incl. `embedding vector(768)`), `reports`, `regulations`, `rate_limits`. Functions `increment_rate_limit(timestamptz)`, `match_scans(...)`. RLS: users read and write only their own rows. `reports` rows with `is_public` are readable by anyone.
