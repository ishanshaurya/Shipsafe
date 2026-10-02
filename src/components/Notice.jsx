// Inline message. Errors say what happened and what to do; they never apologise.
export default function Notice({ tone = "info", title, children, onDismiss }) {
  const isError = tone === "error"
  return (
    <div className={`msg${isError ? " msg-error" : ""}`} role={isError ? "alert" : undefined}>
      <div>
        {title && <div className="msg-title">{title}</div>}
        {children && <div className="msg-body">{children}</div>}
      </div>
      {onDismiss && <button type="button" className="link-btn" onClick={onDismiss}>Dismiss</button>}
    </div>
  )
}
