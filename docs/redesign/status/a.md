# Lane A status

- Phase: A1 (one fetch path)
- State: DONE (gate green, uncommitted in worktree a)
- Last update: 2026-10-04
- Branch: redesign/a-frontend

## Done
- Debugger and Audit use githubImport (importRepo, listRepoFiles, fetchRepoFiles).
- Debugger uses runScan (stream) and findSimilarScans. Inline save and embed removed.
- Local runScan in Debugger renamed handleScan (name clash with the import).
- Tests: githubImport 401 message; src/services/apiBoundary.test.js fails if any file outside src/services calls fetch("/api/...") (verified it fails on a deliberate violation, both quote styles).
- Done criterion met: grep -rn fetch("/api src matches only src/services/*.

## Blocked
- Manual signed-in check of Debugger streaming and similar-scans panel (needs test account or the user).

## Requests
(none)
