// Nothing to show yet: one sentence about what the user will get, plus the next action.
// `ghost` adds a faint outline of the result rows so the panel shows what is coming.
export default function EmptyState({ title, children, action, ghost = false }) {
  return (
    <div className="panel empty">
      <div>
        <h2 className="h2">{title}</h2>
        <p>{children}</p>
      </div>
      {ghost && (
        <div className="ghosts" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ghost"><i /><div><b /><b /></div><em /></div>
          ))}
        </div>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
