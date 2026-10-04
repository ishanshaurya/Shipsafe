// Verdict flags from docs/design/system.md. Shape and word always accompany color.
// Cleared = Blue Peter, Held = Quebec, Blocked = Bravo swallowtail.

import { VERDICT_WORD } from "../verdict"

export default function Flag({ verdict, size = 24, labelled = false }) {
  const a11y = labelled
    ? { role: "img", "aria-label": VERDICT_WORD[verdict] }
    : { "aria-hidden": true }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" focusable="false" {...a11y}>
      {verdict === "cleared" && (
        <>
          <rect x="1" y="4" width="22" height="16" fill="var(--color-cleared)" />
          <rect x="8" y="9" width="8" height="6" fill="#fff" />
        </>
      )}
      {verdict === "held" && (
        <rect x="3.5" y="3.5" width="17" height="17" fill="var(--color-held)" stroke="var(--color-ink)" strokeWidth="1" />
      )}
      {verdict === "blocked" && (
        <path d="M1 4H23L16 12L23 20H1Z" fill="var(--color-blocked)" />
      )}
    </svg>
  )
}
