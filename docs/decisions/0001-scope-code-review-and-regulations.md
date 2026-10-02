# 0001. Scope: code review and AI regulations only

Status: accepted · 2026-10-02

## Context
ShipSafe had six tools across three stages (Code, Legal, Deploy). Stress Test was broken: scans never saved (`saveScan` got the user object, not `user.id`), the AI call always fell back (result treated as a string), the page and server prompt disagreed on the result shape, and the Share button never rendered. Deploy Check worked but was outside the intended focus while the setup is being refactored.

## Decision
Remove Deploy Check and Stress Test, and the pipeline/stage framing around them. Focus on code review (Debugger, Audit) and AI regulation (Regulations, Loopholes). Remove all read-side support too (initially kept, then removed the same day at the user's request). Re-add both later on the shared scan-run module.

## Consequences
- Ship-Readiness Score keeps debugger 25 / audit 20 / loopholes 25, normalized over what has been scanned.
- Landing, Dashboard and README no longer describe a three-stage pipeline.
- Re-adding the tools requires choosing predicted vs measured stress testing first: [parked-tools](../planning/frontend/parked-tools.md).
