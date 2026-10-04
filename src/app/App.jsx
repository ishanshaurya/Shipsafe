import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "../features/auth/AuthProvider"
import Layout from "./Layout"
import ProtectedRoute from "../features/auth/ProtectedRoute"
import Landing from "../features/landing/Landing"
import Login from "../features/auth/Login"
import Dashboard from "../features/dashboard/Dashboard"
import Debugger from "../features/tools/Debugger"
import Loopholes from "../features/tools/Loopholes"
import Audit from "../features/tools/Audit"
import Regulations from "../features/regulations/Regulations"
import Report from "../features/reports/Report"
import ErrorBoundary from "./ErrorBoundary"

function NotFound() {
  return (
    <main style={{
      minHeight: "100vh", background: "var(--color-paper)", color: "var(--color-ink)",
      padding: "96px 32px", maxWidth: 640, margin: "0 auto",
      ["--focus-ring"]: "var(--color-signal-blue)",
    }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 40, lineHeight: 1.05, marginBottom: 16 }}>Page not found</h1>
      <p style={{ color: "var(--color-muted)", fontSize: 16 }}>
        This address doesn't match a page. <a href="/" style={{ color: "var(--color-signal-blue)", fontWeight: 600 }}>Go to ShipSafe</a>.
      </p>
    </main>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/debugger" element={<Debugger />} />
                <Route path="/audit" element={<Audit />} />
                <Route path="/regulations" element={<Regulations />} />
                <Route path="/loopholes" element={<Loopholes />} />
              </Route>
            </Route>

            <Route path="/report/:slug" element={<Report />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
