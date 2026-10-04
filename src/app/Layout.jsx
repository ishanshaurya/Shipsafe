import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from '../shared/components/Logo'
import { useAuth } from '../features/auth/useAuth'
import { TOOL_GROUPS } from '../shared/toolRegistry'

const navClass = ({ isActive }) => `rail-link${isActive ? ' active' : ''}`

export default function Layout() {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [lastPath, setLastPath] = useState(pathname)

  // Close the drawer after navigating (adjusting state during render, not in an effect)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div>
      <a href="#main" className="skip-link">Skip to content</a>

      <div className={`shell-backdrop${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <aside id="rail" className={`shell-rail${open ? ' open' : ''}`} aria-label="Sidebar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/dashboard" className="shell-brand">
            <Logo size={28} tone="ink" />
            ShipSafe
          </Link>
          <button type="button" className="btn btn-onink btn-sm shell-close" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="shell-nav" aria-label="Main">
          <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
          {TOOL_GROUPS.map(({ group, tools }) => (
            <div key={group}>
              <div className="rail-group">{group}</div>
              {tools.map((t) => (
                <NavLink key={t.id} to={t.path} className={navClass}>{t.name}</NavLink>
              ))}
            </div>
          ))}
        </nav>

        {user && (
          <div className="rail-user">
            <div className="rail-user-email" title={user.email}>{user.email}</div>
            <button type="button" className="btn btn-onink btn-sm" onClick={signOut}>Sign out</button>
          </div>
        )}
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <button type="button" className="btn btn-ghost btn-sm" aria-label="Open menu" aria-expanded={open} aria-controls="rail" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          ShipSafe
        </header>
        <main id="main" className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
