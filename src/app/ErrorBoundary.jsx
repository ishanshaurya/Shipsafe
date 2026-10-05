import { Component } from "react"

// Last line of defense: a render error anywhere below shows this instead of a blank page.
// Sits outside the router and auth provider, so it uses a plain link and no app state.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] render failed:", error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main role="alert" style={{
        minHeight: "100vh", background: "var(--color-paper)", color: "var(--color-ink)",
        padding: "96px 32px", maxWidth: 640, margin: "0 auto",
      }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 40, lineHeight: 1.05, marginBottom: 16 }}>Something went wrong</h1>
        <p style={{ color: "var(--color-muted)", fontSize: 16 }}>
          The page hit an unexpected error. <a href="/" style={{ color: "var(--color-signal-blue)", fontWeight: 600 }}>Reload ShipSafe</a> and try again.
        </p>
      </main>
    )
  }
}
