// src/components/Logo.jsx
// ShipSafe Logo — Lock/Shield hybrid
// Usage: <Logo size={32} /> or <Logo size={24} tone="light" /> (tone = dark | light | ink: the surface it sits on)

const PALETTES = {
  dark: { shield: "#06b6d4", stroke: "#34d399", fill: "rgba(52,211,153,0.12)" },
  light: { shield: "#1f5fbf", stroke: "#12263f", fill: "rgba(31,95,191,0.12)" },
  ink: { shield: "#9cc3f7", stroke: "#e8eef5", fill: "rgba(156,195,247,0.16)" },
}

export default function Logo({ size = 32, tone = "dark" }) {
  const p = PALETTES[tone]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Shield outline (subtle) */}
      <path
        d="M16 28L40 8L64 28"
        stroke={p.shield}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
      {/* Lock body */}
      <rect
        x="22"
        y="40"
        width="36"
        height="28"
        rx="5"
        fill={p.fill}
        stroke={p.stroke}
        strokeWidth="2.5"
      />
      {/* Lock shackle */}
      <path
        d="M30 40V30C30 20 34 14 40 14C46 14 50 20 50 30V40"
        stroke={p.stroke}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Keyhole circle */}
      <circle cx="40" cy="52" r="4.5" fill={p.stroke} />
      {/* Keyhole slot */}
      <rect x="38" y="55" width="4" height="8" rx="2" fill={p.stroke} />
    </svg>
  )
}
