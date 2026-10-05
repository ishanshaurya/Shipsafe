import Notice from "./Notice"
import Button from "./Button"

// A failed async action: what failed, what to do, and a retry button when one exists.
// The caller keeps the user's input so retry is one click.
export default function ErrorState({ title, children, onRetry, retryLabel = "Try again", onDismiss }) {
  return (
    <Notice tone="error" title={title} onDismiss={onDismiss}>
      {children}
      {onRetry && (
        <div style={{ marginTop: 8 }}>
          <Button variant="secondary" size="sm" onClick={onRetry}>{retryLabel}</Button>
        </div>
      )}
    </Notice>
  )
}
