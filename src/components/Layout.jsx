import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Bug, Search, Scale, KeyRound,
  Rocket, FlaskConical, Shield, Bell, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

// ─── Navigation items ─────────────────────────────────────
// Each item maps to a route in App.jsx
// The "phase" label helps you (and users) know what's built
const NAV_ITEMS = [
  { path: '/dashboard',    label: 'Dashboard',       icon: LayoutDashboard, phase: 'P1' },
  { path: '/debugger',     label: 'AI Debugger',     icon: Bug,             phase: 'P1', isNew: true },
  { path: '/audit',        label: 'Vibe-Code Audit', icon: Search,          phase: 'P2', isNew: true },
  { path: '/regulations',  label: 'Regulations',     icon: Scale,           phase: 'P3' },
  { path: '/loopholes',    label: 'Loopholes',       icon: KeyRound,        phase: 'P2', isNew: true },
  { path: '/deploy-check', label: 'Deploy Check',    icon: Rocket,          phase: 'P4' },
  { path: '/stress-test',  label: 'Stress Test',     icon: FlaskConical,    phase: 'P4' },
]

// ─── Layout Component ─────────────────────────────────────
// This wraps every /app route. It renders:
// 1. A top navbar (logo + alerts)
// 2. A left sidebar (navigation links)
// 3. The page content via <Outlet /> (React Router magic)
//
// <Outlet /> is how nested routing works — it renders
// whatever child route matches the current URL.

export default function Layout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, signOut } = useAuth()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* ─── SIDEBAR ─── */}
      <aside style={{
        width: sidebarOpen ? 220 : 60,
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        overflow: 'hidden',
      }}>
        {/* Logo area */}
        <div style={{
          padding: sidebarOpen ? '18px 20px' : '18px 12px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            flexShrink: 0,
          }}>
            🛡
          </div>
          {sidebarOpen && (
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                lineHeight: 1,
              }}>
                ShipSafe
              </div>
              <div style={{
                fontSize: 9,
                color: 'var(--text-dimmed)',
                letterSpacing: '0.1em',
                marginTop: 3,
              }}>
                BUILD · VALIDATE · DEPLOY
              </div>
            </div>
          )}
        </div>

        {/* Navigation links */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: sidebarOpen ? '10px 14px' : '10px 0',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: isActive ? 'var(--accent-light)' : 'var(--text-muted)',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(56, 189, 248, 0.2)' : 'transparent'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {sidebarOpen && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.isNew && (
                      <span style={{
                        fontSize: 8,
                        fontWeight: 700,
                        color: 'var(--green)',
                        letterSpacing: '0.05em',
                      }}>
                        NEW
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar toggle */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dimmed)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div style={{
        flex: 1,
        marginLeft: sidebarOpen ? 220 : 60,
        transition: 'margin-left 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top bar */}
        <header style={{
          height: 52,
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-primary)',
          zIndex: 40,
        }}>
          {/* Breadcrumb - shows current page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dimmed)' }}>ShipSafe</span>
            <span style={{ fontSize: 11, color: 'var(--text-dimmed)' }}>/</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {location.pathname.slice(1) || 'dashboard'}
            </span>
          </div>

          {/* Right side - user auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user ? (
              <>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {user.email}
                </span>
                <button onClick={signOut} style={{
                  background: 'none',
                  border: '1px solid var(--border-default)',
                  borderRadius: 6,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '5px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                }}>
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" style={{
                border: '1px solid var(--border-default)',
                borderRadius: 6,
                color: 'var(--text-muted)',
                padding: '5px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                textDecoration: 'none',
              }}>
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Page content - this is where each route renders */}
        <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1200 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
