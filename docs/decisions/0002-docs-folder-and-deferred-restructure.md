# 0002. One docs/ folder; code restructure deferred

Status: accepted · 2026-10-02

## Context
Plans were scattered (`TODO.md`, `FRONTEND_TODO.md`, `CHANGES.md`, README roadmap, inline TODOs) and project explanation lived only in the README. Source files were mid-refactor with uncommitted work from other sessions.

## Decision
All non-code documentation lives in `docs/` (overview, architecture, gotchas, api, design, decisions, planning). Plans moved from `Planning/` to `docs/planning/`. The `src/` restructure stays as refactor item 6 and is not applied until items 1–4 land and the git tree is clean.

## Consequences
- No source file moved by this change; no conflict with in-flight scan-run, GitHub import or redesign work.
- Update `docs/` in the same change as any endpoint, env var or scope change.
