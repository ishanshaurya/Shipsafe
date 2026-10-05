import { Loader2 } from "lucide-react"

// Decorative; pair it with text or a role="status" region that says what is loading.
// Stops turning under prefers-reduced-motion (see index.css).
export default function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="spin" aria-hidden="true" />
}
