# Design system — "port clearance"

Light theme. A vessel is cleared to sail by inspection; ShipSafe clears a project by inspecting its code and its legal exposure. The metaphor lives in the **verdict flags** and the ledger layout, not in the copy: labels stay plain.

## Design plan, then critique

### Plan (first pass)
- **Color:** flag-white page, hull-navy ink, signal blue, buoy yellow, pennant red.
- **Type:** condensed stencil display for headlines and numbers, humanist grotesk for UI, mono for code.
- **Layout:** left rail + ruled ledgers (rows, not cards); two-pane tool pages.
- **Memorable element:** the verdict flag that is hoisted when a scan finishes.

### Critique against generic AI-design defaults, and what changed
| Finding | Revision |
|---|---|
| Earlier page color `#F6F7F3` sits close to the warm cream-page default | Cooler `#F2F5F7` |
| Uppercase tracked eyebrows are all over the current app ("THE PIPELINE", "SIX TOOLS", "QUICK ACTIONS", "HOW IT WORKS") | None. Group headings are sentence case. |
| `→` appended to buttons ("Start scanning →", "Dashboard →", "Try it →") | Removed; verbs only |
| Identical rounded cards for every tool/section | Ruled ledger rows; only controls are rounded; panels are square with 1px rules |
| Numbered stages (01/02/03) for Code/Legal/Deploy | Gone with the pipeline. Numbers only where content is a real sequence ("how a scan works") |
| Small mono data labels, middle-dot meta strings (`A · B · C`) | Mono is for code and file paths only; metadata is plain prose or separate fields |
| Scroll-reveal on every section, hover-lift cards, hero big-number-plus-gradient | None. One orchestrated moment (the hoist) plus motion that answers an action |
| Yellow text on light fails contrast | Yellow is a fill only, with navy text on it |
| Dark default (near-black + acid accent) | Light only for v1; dark is a later token swap |

## Color tokens
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F2F5F7` | Page background |
| `--surface` | `#FFFFFF` | Panels, inputs, ledger rows |
| `--ink` | `#12263F` | Text, rail background, code panels |
| `--muted` | `#51657A` | Secondary text |
| `--rule` | `#CBD5DD` | Dividers (decorative only) |
| `--control` | `#74879B` | Input and control borders (≥3:1) |
| `--blue` | `#1F5FBF` | Primary action, links, focus ring, Cleared |
| `--yellow` | `#EFB11F` | Held fill (navy text/glyph on it, never as text) |
| `--red` | `#D2362B` | Blocked fill (white on it); text variant `--red-text #B42318` |
| `--code-text` | `#E8EEF5` | Text on ink |
| `--code-muted` | `#A9B8C8` | Secondary text on ink |
| `--link-on-ink` | `#9CC3F7` | Links and focus ring on ink |

Contrast (computed, WCAG): ink/paper 13.95 · ink/white 15.28 · muted/paper 5.49 · blue/white 6.09 · blue/paper 5.56 · white/red 4.88 · **red/paper 4.46 (fails body text, so red text uses `--red-text` 6.0)** · ink/yellow 7.99 · control/white 3.70, control/paper 3.38 · code-text/ink 13.08 · code-muted/ink 7.55 · link-on-ink/ink 8.41.

## Verdict (the one shared meaning of color)
| Verdict | When | Flag shape | Fill | Word |
|---|---|---|---|---|
| Cleared | score ≥ 80, or severity low | Blue field with a white inset rectangle (Blue Peter) | `--blue` | Cleared |
| Held | 60–79, or medium | Solid square, navy 1px outline (Quebec) | `--yellow` | Held |
| Blocked | < 60, or critical/high | Swallowtail pennant (Bravo) | `--red` | Blocked |
Shape and word always accompany color. Loophole risk is inverted (risk 100 = Blocked). Bands (≥80 / 60–79 / <60) and the severity mapping are **pending your confirmation**; they drop the current 40 band.

## Type
| Role | Family | Weights | Notes |
|---|---|---|---|
| Display, numerals, verdict words | Big Shoulders Display | 700, 800 | Condensed, sentence case, tracking 0 |
| UI and body | Schibsted Grotesk | 400, 500, 600 | |
| Code, file paths | IBM Plex Mono | 400 | Nothing else is mono |
Load once with `<link>` + `preconnect` in `index.html`; delete the per-page `@import`s.

Scale (desktop / mobile): display 64/44 · h1 40/32 · h2 28/24 · h3 20/18 · body 16 · small 14 · caption 13. Body line-height 1.55, headings 1.05. Measure ≤ 68ch. Left-aligned everywhere (no centered body copy); the only centered layout is Login.

## Space, shape, depth
- Spacing (4-pt): 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radius: 0 for flags, panels, ledger rows; 6px for inputs, buttons, chips.
- Depth: none. Separation is 1px `--rule` lines and paper/white contrast. Menus and popovers only: 1px `--ink` border plus one hard offset shadow.
- Focus: 2px `--blue` ring with 2px offset (`--link-on-ink` on ink surfaces).

## Motion
| Moment | Motion | Duration |
|---|---|---|
| Landing hero (**the one orchestrated moment**) | Three sample flags hoist up a staff once on load | 700ms ease-out, once |
| Scan finishes | Verdict flag hoists into the banner (answers the user's action) | 240ms |
| Finding row opens/closes | Height + chevron | 160ms |
| Copy / create-link confirm | Inline text swap ("Copy fix" to "Copied") | instant, resets in 2s |
`prefers-reduced-motion: reduce`: flags render at their final position, rows toggle instantly. No scroll reveals, no hover lifts, no looping animation (the rotating topic text in Regulations goes).

## Voice
Sentence case, plain verbs, the same name for an action all the way through ("Create report link" → "Report link created"). Errors say what happened and what to do, with no apology. Empty states point at the next action. Tool names stay: AI Debugger, Vibe-Code Audit, Regulations, Loophole Finder.

## Accessibility floor
Visible keyboard focus everywhere · all expanders are buttons with `aria-expanded` · scan status announced via `aria-live="polite"` ("Scan finished: Held, score 62") · streaming output region `aria-busy` while running · every input has a visible label and errors tied with `aria-describedby` · skip link · one `h1` per page · tap targets ≥ 44px · no horizontal page scroll at 375px (code scrolls inside its panel) · `color-scheme: light`.
