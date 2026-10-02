# GitHub import

Refactor item 2. Starts after the scan-run module (see [`../business-logic/scan-run.md`](../business-logic/scan-run.md)).
`src/services/githubImport.js` and its tests already exist (new, uncommitted).

- [ ] Deepen: one module hides `/api/github` modes (list / pick / fetch) plus loading/error/selection state; Audit and Debugger consume it.
- [ ] **Server limit:** `api/github.js` list mode only returns the ≤25 files `smartSelect()` picked, so a large repo never shows its full tree. (Pointer left at `src/services/githubImport.js`, `listRepoFiles`.)
- [ ] Optional: `GITHUB_TOKEN` handling for private repos / rate limits is documented in the README troubleshooting table; keep in sync.
