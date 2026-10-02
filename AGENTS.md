# ShipSafe — agent notes

React 19 + Vite SPA, Vercel serverless `api/`, Supabase. Tools: Debugger, Audit, Regulations, Loopholes.

- Start with `docs/overview.md`; endpoints in `docs/api/`; sharp edges in `docs/gotchas.md`.
- Plans and open TODOs: `docs/planning/` (order and status: `docs/planning/plans/refactor-sequence.md`).
- Layout rules: pages → `src/services` → Supabase/`api/`. Only `scanService.js` calls `/api/gemini`; only `supabaseService.js` talks to Supabase.
- No new folders under `src/` until refactor item 6; new files go flat in `src/components/` / `src/utils/`.
- Commands: `npm run dev`, `npm test`, `npm run lint`, `npm run build` (AI endpoints need `npx vercel dev`).
- Never read or print `.env*` values. Don't commit unless asked.
- Changing an endpoint, env var or scope? Update `docs/` in the same change.
