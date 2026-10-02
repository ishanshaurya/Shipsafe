# Components

Only components that hide behavior or carry a shared meaning are primitives. Plain layout stays as markup. Files go flat in `src/components/` / `src/utils/` until the folder reshape (refactor item 6).

## Deep modules (own the rule, many callers)
| Module | Owns | Replaces |
|---|---|---|
| **Verdict** | score → Cleared/Held/Blocked, severity → verdict, inversion flag for risk scores; label, shape, fill, text color | 7 private maps in `Debugger`, `Report`, `Regulations`, `Audit`, `NextSteps`, `ScoreRing`, `shipReadiness` |
| **Tool registry** | The four tools: name, path, group (Code review / AI regulation), one-line purpose, icon | `Layout` NAV, `Landing` FEATURES, `Dashboard` TOOLS |

## Primitives
| Component | Variants / states | Notes |
|---|---|---|
| **Flag** | Cleared, Held, Blocked × 16/24/48px | SVG with the shape rules in `system.md`; `title` + visible word |
| **Gauge** (restyle of `ScoreRing`) | Keep the 5 callers' props | Ring in verdict color, Big Shoulders numeral |
| **Button** | primary (blue), secondary (ink outline), ghost; sm/md; link form; loading (spinner + same label, disabled) | Verb labels, no arrows |
| **Field** | text, textarea, select, password with show toggle | Label above, hint, error; focus ring |
| **Chip** | selectable (countries, topics) | Checked state uses a check mark, not color alone |
| **Ledger / Row** | collapsed, expanded, hover, focus | Left flag rail, title, meta, chevron; expands to detail + fix + copy |
| **Banner** | verdict, info, error | Verdict banner = Flag + numeral + one-sentence summary |
| **CodePanel** | editable (editor) or read-only (fix/snippet) | Ink surface, Plex Mono, line numbers, scrolls inside |
| **Skeleton** | row, banner | Replaces plain "Loading…" |
| **EmptyState** | per page | One sentence + the next action |

## State matrix (every data view)
| State | Treatment |
|---|---|
| Idle | Input visible, "Load sample" for tools, results area shows what a result looks like (greyed) |
| Loading | Debugger: streaming text in a CodePanel. Others: skeleton banner + rows and a status line ("Checking security, quality, maintainability") |
| Success | Verdict banner hoists in; critical/high rows open; announce via `aria-live` |
| Empty result | Cleared flag + "No issues found in what you submitted." |
| Error | What failed and what to do; input is kept; retry button. Rate limit (429): "You've reached the limit of 20 scans per minute. Try again in a minute." |
| Import (GitHub) | Importing, picker, importing selected, error; the button never sticks in loading |
| Signed out | Tool pages are protected; redirect to Login, return after |
