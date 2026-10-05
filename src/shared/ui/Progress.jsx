// A status line for a long wait: names the current step and shows the earlier ones as done.
// role="status" announces each step change politely. Plain text, so reduced motion needs nothing.
export default function Progress({ steps, current }) {
  return (
    <div role="status">
      <ol className="progress-steps" aria-label="Progress">
        {steps.map((label, i) => (
          <li key={label} aria-current={i === current ? "step" : undefined} className={i < current ? "done" : i === current ? "now" : ""}>
            {label}
          </li>
        ))}
      </ol>
    </div>
  )
}
