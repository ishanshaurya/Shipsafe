import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./hooks/useAuth"
import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Debugger from "./pages/Debugger"
import Loopholes from "./pages/Loopholes"
import Audit from "./pages/Audit"
import Regulations from "./pages/Regulations"
import DeployCheck from "./pages/DeployCheck"
import StressTest from "./pages/StressTest"
import Report from "./pages/Report"
import GradientShimmerDemo from "./pages/GradientShimmerDemo"

function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", background: "#000",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif", gap: 20,
    }}>
      <div style={{ fontSize: 80, fontWeight: 900, color: "rgba(255,255,255,0.06)", letterSpacing: "-0.05em", lineHeight: 1 }}>404</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.02em" }}>Page not found</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>This page doesn't exist or has moved.</div>
      <a href="/" style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Back to ShipSafe</a>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/demo/gradient-shimmer" element={<GradientShimmerDemo />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/debugger" element={<Debugger />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/regulations" element={<Regulations />} />
              <Route path="/loopholes" element={<Loopholes />} />
              <Route path="/deploy-check" element={<DeployCheck />} />
              <Route path="/stress-test" element={<StressTest />} />
            </Route>
          </Route>

          <Route path="/report/:slug" element={<Report />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
