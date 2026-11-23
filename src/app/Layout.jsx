import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from '../shared/components/Logo'
import Button from '../shared/ui/Button'
import { useAuth } from '../features/auth/useAuth'
import { TOOL_GROUPS } from '../shared/toolRegistry'

const navClass = ({ isActive }) => `bar-link${isActive ? ' active' : ''}`

export default function Layout() {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [lastPath, setLastPath] = useState(pathname)

  // Close the menu after navigating (adjusting state during render, not in an effect)
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

      <header className="bar">
        <Link to="/dashboard" className="bar-brand">
          <Logo size={24} tone="light" />
          ShipSafe
        </Link>

        <Button
          variant="ghost" size="sm" className="bar-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="bar-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </Button>

        <div id="bar-menu" className={`bar-menu${open ? ' open' : ''}`}>
          <nav className="bar-nav" aria-label="Main">
            <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
            {TOOL_GROUPS.map(({ group, tools }) => (
              <div key={group} className="nav-group" role="group" aria-label={group}>
                <span className="nav-group-label" aria-hidden="true">{group}</span>
                {tools.map((t) => (
                  <NavLink key={t.id} to={t.path} className={navClass}>{t.name}</NavLink>
                ))}
              </div>
            ))}
          </nav>

          {user && (
            <div className="bar-user">
              <span className="bar-user-email" title={user.email}>{user.email}</span>
              <Button variant="secondary" size="sm" onClick={signOut}>Sign out</Button>
            </div>
          )}
        </div>
      </header>

      <div className={`shell-backdrop${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <main id="main" className="page">
        <Outlet />
      </main>
    </div>
  )
}
