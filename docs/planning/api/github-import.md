# GitHub import

Refactor item 2. Starts after the scan-run module (see [`../business-logic/scan-run.md`](../business-logic/scan-run.md)).
`src/features/github-import/githubImport.js` and its tests exist.

- [x] Audit and Debugger consume `githubImport.js` (no direct `/api/github` fetch left; `src/app/architecture.test.js` enforces it for every `/api/*` route).
- [x] Loading, error and file-selection state moved into `useRepoImport` (`src/features/github-import/`).
- [ ] **Server limit:** `api/github.js` list mode only returns the ≤25 files `smartSelect()` picked, so a large repo never shows its full tree. (Pointer left at `src/features/github-import/githubImport.js`, `listRepoFiles`.)
- [ ] Optional: `GITHUB_TOKEN` handling for private repos / rate limits is documented in the README troubleshooting table; keep in sync.
