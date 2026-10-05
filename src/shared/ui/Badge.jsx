// Small status tag next to a row or file name. Tone is only a hint of weight;
// verdicts (Cleared / Held / Blocked) use Flag, which carries the shape rules.
export default function Badge({ tone = "neutral", children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
