# ShipSafe — agent notes

React 19 + Vite SPA, Vercel serverless `api/`, Supabase. Tools: Debugger, Audit, Regulations, Loopholes.

- Start with `docs/overview.md`; endpoints in `docs/api/`; sharp edges in `docs/gotchas.md`.
- Plans and open TODOs: `docs/planning/` (order and status: `docs/planning/plans/refactor-sequence.md`).
- Layout: `src/app/`, `src/features/<feature>/`, `src/shared/`. Pages and components call feature services, never `fetch("/api/...")` or the Supabase client. Allowed callers are listed in `docs/architecture.md` and enforced by `src/app/architecture.test.js`; a new caller means editing that allowlist on purpose.
- New files go in the feature folder that owns them, or `src/shared/` if used by several. No source file over 400 lines.
- Commands: `npm run dev`, `npm test`, `npm run lint`, `npm run build` (AI endpoints need `npx vercel dev`).
- Never read or print `.env*` values. Don't commit unless asked.
- Changing an endpoint, env var or scope? Update `docs/` in the same change.
