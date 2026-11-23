# Components

Only components that hide behavior or carry a shared meaning are primitives. Plain layout stays as markup. Shared ones live in `src/shared/components/`; feature-only ones sit in their feature folder.

## Deep modules (own the rule, many callers)
| Module | Owns | Replaces |
|---|---|---|
| **Verdict** | score → Cleared/Held/Blocked, severity → verdict, inversion flag for risk scores; label, shape, fill, text color | 7 private maps in `Debugger`, `Report`, `Regulations`, `Audit`, `NextSteps`, `ScoreRing`, `shipReadiness` |
| **Tool registry** | The four tools: name, path, group (Code review / AI regulation), one-line purpose, icon | `Layout` NAV, `Landing` FEATURES, `Dashboard` TOOLS |

## Primitives
| Component | Variants / states | Notes |
|---|---|---|
| **Flag** | Cleared, Held, Blocked × 16/24/48px | SVG with the shape rules in `system.md`; `title` + visible word |
| **Gauge** (inside `VerdictBanner`) | `score`, `risk` | 0–100 ruler: score marker below, limit marker above (80 ship line; 20 for risk scores). `role="img"` with the numbers in its label |
| **Button** | primary (blue), secondary (ink outline), ghost; sm/md; link form; loading (spinner + same label, disabled) | Verb labels, no arrows |
| **Field** | text, textarea, select, password with show toggle | Label above, hint, error; focus ring |
| **Chip** | selectable (countries, topics) | Checked state uses a check mark, not color alone |
| **Ledger / Row** | collapsed, expanded, hover, focus | Left flag rail, title, meta, chevron; expands to detail + fix + copy |
| **Banner** | verdict, info, error | Verdict banner = Flag + numeral + one-sentence summary |
| **CodePanel** | editable (editor) or read-only (fix/snippet) | Ink surface, Plex Mono, line numbers, scrolls inside |
| **Skeleton** | row, banner | Replaces plain "Loading…" |
| **EmptyState** | per page | One sentence + the next action |

## Where they live
Button, Card (the `panel` surface), Field (label, control, hint, error, optional action beside it), Badge, Spinner, Skeleton / SkeletonLines, EmptyState, ErrorState (Notice plus a Try again button) and Progress (named steps in a `role="status"` region, driven by `useProgressStep` when there is no real signal) are in `src/shared/ui/`. Pages use them instead of raw `btn`, `panel`, `field`, `skel` markup. Landing still carries its own `ls-btn` styles. Chip, Ledger row, Banner and CodePanel stay in `src/shared/components/`.

## State matrix (every data view)
| State | Treatment |
|---|---|
| Idle | Input visible, "Load sample" for tools, results area shows what a result looks like (greyed) |
| Loading | Every tool and Regulations: heading, named progress steps (`Progress`, announced via `role="status"`) and skeleton rows. Debugger also shows a live findings count and the streaming tail. Dashboard and Report: skeleton rows with a screen-reader label. Steps without a real signal advance on a timer, so treat them as an estimate |
| Success | Verdict banner hoists in; critical/high rows open; announce via `aria-live` |
| Empty result | Cleared flag + "No issues found in what you submitted." |
| Error | What failed and what to do; input is kept; **Try again** button (ErrorState). Rate limit (429): "You've reached the limit of 20 scans per minute. Try again in a minute." |
| Import (GitHub) | Importing, picker, importing selected, error; the button never sticks in loading |
| Signed out | Tool pages are protected; redirect to Login, return after |
