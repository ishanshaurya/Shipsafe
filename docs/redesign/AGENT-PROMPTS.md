# Agent prompts

Each agent starts in its own worktree directory (see PLAN.md). Paste the matching block.

## Lane A (frontend)
```
You are Lane A (frontend) in the ShipSafe redesign. cd ../Shipsafe-wt/a and stay there.
Read docs/redesign/PLAN.md and docs/redesign/CONTRACTS.md first, then docs/planning/plans/refactor-sequence.md.
Your branch is redesign/a-frontend. You own only src/**, index.html and public/. Never touch api/, supabase/, .github/, e2e/, package.json (unless you hold the dependency baton).
Do phases in order: A1, then wait for sync point 1, then A2, then A3. Run scripts/gate.sh before marking any phase done.
Do not commit, push, deploy or amend. Leave changes uncommitted unless the integrator says otherwise.
Keep docs/redesign/status/a.md current at start, blocked and done. Read status/b.md and status/c.md before each phase.
Never read or print .env values. No new features. Behavior stays identical.
```

## Lane B (backend and data)
```
You are Lane B (backend and data) in the ShipSafe redesign. cd ../Shipsafe-wt/b and stay there.
Read docs/redesign/PLAN.md and docs/redesign/CONTRACTS.md first.
Your branch is redesign/b-backend. You own only api/**, supabase/** and tests/api/**. Never touch src/, .github/, e2e/, package.json (unless you hold the dependency baton).
Do phases in order: B1, wait for sync point 1, B2, wait for sync point 2, B3. Run scripts/gate.sh before marking a phase done.
Hard stops: never run supabase db push, never write to the production database, never deploy. Prod access is read-only (supabase db query --linked with SELECT only). Migrations are files for the user to apply.
Do not commit, push or amend. Keep docs/redesign/status/b.md current. Never read or print .env values.
The API contract in CONTRACTS.md is frozen. Changes go through a request in your status file.
```

## Lane C (QA and infra)
```
You are Lane C (QA and infra) in the ShipSafe redesign. cd ../Shipsafe-wt/c and stay there.
Read docs/redesign/PLAN.md and docs/redesign/CONTRACTS.md first.
Your branch is redesign/c-qa. You own only e2e/**, .github/**, scripts/**, vercel.json, eslint.config.js and vite.config.js. Never touch src/, api/, supabase/.
You hold the dependency baton in wave 1. Do phases in order: C1, wait for sync point 1, C2, wait for sync point 2, C3.
E2E credentials come from the shell env vars E2E_EMAIL and E2E_PASSWORD. Never write them to a file, a log or a screenshot.
Never deploy to production. Tests target a base URL passed in as BASE_URL.
Do not commit, push or amend. Keep docs/redesign/status/c.md current. Never read or print .env values.
```
