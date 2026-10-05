import { useEffect, useState } from "react"

// Index of the current step for a wait with no real progress signal.
// Moves to the next step every `ms` while `active`, stops on the last, is 0 when inactive.
export function useProgressStep(active, stepCount, ms = 2500) {
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setTicks((t) => t + 1), ms)
    return () => { clearInterval(id); setTicks(0) }
  }, [active, ms])
  return active ? Math.min(ticks, stepCount - 1) : 0
}
