# Parked: Deploy Checker and Stress Tester

Build on the shared scan-run module ([`../business-logic/scan-run.md`](../business-logic/scan-run.md)), not as page-local pipelines.

Removed 2026-10-02 to focus on AI regulations + code review while the setup is refactored. Last working code is in git history (`git log --diff-filter=D --name-only -- src/pages/DeployCheck.jsx src/pages/StressTest.jsx`).

### Deploy Checker
- [ ] Page, route `/deploy-check`, sidebar entry, Landing card, Dashboard quick action.
- [ ] Server prompt + validator + normalizer + `extractScore` (was in `api/gemini.js` / `scanService.js`).
- [ ] Re-add cross-tool suggestions (Debugger on security issues, Loopholes on data grey areas, Audit on low deployReady score).
- [ ] Decide its weight in the Ship-Readiness score (was 30%).
- [ ] Re-add read-side rendering (Dashboard issue count and color, `Report.jsx` branch, `toolLabel`, Debugger recent-scans icon) — removed 2026-10-02 along with everything else for this tool.

### Stress Tester
Decide first — the old version mixed two jobs and never worked:
- [ ] Choose: AI-**predicted** bottlenecks from a stack description (server prompt shape) **or** **measured** load from real requests (page shape). Not both under one result shape.
- [ ] If measured: browser-fired load at arbitrary URLs is an abuse vector and mostly blocked by CORS. Prefer a server-side probe with SSRF protection, auth and a hard request cap.
- [ ] One result shape owned by one normalizer; page, Report, suggestions and Dashboard all read it.
- [ ] `saveScan(user.id, …)`, handle `{content, error}`, pass `ReportButton` its real props (`scanType`, `resultData`, `title`).
