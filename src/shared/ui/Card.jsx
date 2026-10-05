// A bordered surface. `pad` adds the standard 24px padding.
export default function Card({ as = "div", pad = false, className = "", ...rest }) {
  const Tag = as
  return <Tag className={["panel", pad && "panel-pad", className].filter(Boolean).join(" ")} {...rest} />
}
