import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./hooks/AuthProvider"
import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Debugger from "./pages/Debugger"
import Loopholes from "./pages/Loopholes"
import Audit from "./pages/Audit"
import Regulations from "./pages/Regulations"
import Report from "./pages/Report"

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
  )
}
