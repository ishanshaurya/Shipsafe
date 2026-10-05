import { Link } from "react-router-dom"
import Spinner from "./Spinner"

// Variants: primary, secondary, ghost, onink. `loading` shows a spinner before the same label and disables the button.
// With `to` it renders a router link styled as a button.
export default function Button({ variant = "primary", size, block, loading = false, disabled, to, className = "", children, ...rest }) {
  const classes = ["btn", `btn-${variant}`, size === "sm" && "btn-sm", block && "btn-block", className].filter(Boolean).join(" ")
  if (to) return <Link to={to} className={classes} {...rest}>{children}</Link>
  return (
    <button type="button" className={classes} disabled={disabled || loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}
