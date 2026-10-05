import { useState, useEffect } from "react"
import { getCurrentUser, onAuthChange, signOut as authSignOut } from "./authService"
import { AuthContext } from "./useAuth"

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser().then((current) => {
      setUser(current)
      setLoading(false)
    })
    return onAuthChange(setUser)
  }, [])

  const signOut = async () => {
    await authSignOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
