import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div role="status" style={{ minHeight: "100vh", padding: "96px 32px", maxWidth: 640, margin: "0 auto" }}>
        <div className="skel" style={{ width: 160, height: 28, marginBottom: 16 }} />
        <div className="skel" style={{ width: "100%" }} />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
