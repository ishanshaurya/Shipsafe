# POST /api/github

Fetches scannable source files from a GitHub repo for Audit and Debugger. Uses `GITHUB_TOKEN` if set (raises rate limits, allows private repos the token can read).
**Auth:** none. **CORS:** `*`.

## Request
| Field | Type | Notes |
|---|---|---|
| `url` | string | Required. `https://github.com/owner/repo`; also accepts a branch, subdirectory or single-file URL |
| `mode` | `"list"` | Optional. Return file metadata for the picker instead of contents |
| `files` | string[] | Optional. Paths to fetch (must be within the auto-selected set) |

## Three shapes (what `githubImport.js` calls)
| Call | Body | Returns |
|---|---|---|
| Quick import | `{ url }` | `{ repo, files: string[], fileCount, totalLines, code }` |
| List | `{ url, mode: "list" }` | `{ repo, files: [{ path, size, autoSelected }], fileCount }` |
| Fetch picked | `{ url, files: [...] }` | same as quick import, restricted to `files` |
A single-file URL skips the tree and returns that file (`fileCount: 1`). `repo` is `{ name, description, language, stars, url }`. `code` is files joined as `// === path ===\n<content>`.

## Limits and filtering
- At most **25 files** per repo (`MAX_FILES`), files over **60 KB** skipped, lockfiles/`node_modules`/`dist` etc. skipped, config files (`package.json`, `Dockerfile`, …) prioritized, the rest spread across directories (`smartSelect`).
- **Known limitation:** list mode and the `files` filter both operate on that 25-file subset, so a large repo's full tree is never shown. Tracked in [planning](../planning/api/github-import.md).

## Errors
`400` missing/invalid URL · `404` empty repo, no scannable files, unreadable file · `502` GitHub error or rate limit exceeded (message passed through).
