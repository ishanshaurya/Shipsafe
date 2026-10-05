// Nothing to show yet: one sentence about what the user will get, plus the next action.
export default function EmptyState({ title, children, action }) {
  return (
    <div className="panel empty">
      <h2 className="h2">{title}</h2>
      <p>{children}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
