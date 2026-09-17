// src/components/Logo.jsx
// ShipSafe Logo — Lock/Shield hybrid
// Usage: <Logo size={32} /> or <Logo size={24} />

export default function Logo({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield outline (subtle, cyan) */}
      <path
        d="M16 28L40 8L64 28"
        stroke="#06b6d4"
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
        fill="rgba(52,211,153,0.12)"
        stroke="#34d399"
        strokeWidth="2.5"
      />
      {/* Lock shackle */}
      <path
        d="M30 40V30C30 20 34 14 40 14C46 14 50 20 50 30V40"
        stroke="#34d399"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Keyhole circle */}
      <circle cx="40" cy="52" r="4.5" fill="#34d399" />
      {/* Keyhole slot */}
      <rect x="38" y="55" width="4" height="8" rx="2" fill="#34d399" />
    </svg>
  )
}
