import { useId } from "react"

// Label above a text input, textarea or select. `as` picks the control.
// `action` puts a button beside the control (search, import). `hint` and `error` are
// linked to the control with aria-describedby unless the caller passes its own.
export default function Field({ label, hint, error, action, as = "input", id, className = "", ...props }) {
  const Control = as
  const autoId = useId()
  const fieldId = id ?? autoId
  const noteId = `${fieldId}-note`
  const describedBy = props["aria-describedby"] ?? (hint || error ? noteId : undefined)
  const control = (
    <Control
      id={fieldId}
      className={["field", className].filter(Boolean).join(" ")}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      {...props}
    />
  )
  return (
    <>
      <label className="label" htmlFor={fieldId}>{label}</label>
      {action ? <div className="field-row">{control}{action}</div> : control}
      {error ? <div id={noteId} className="field-error">{error}</div>
        : hint ? <div id={noteId} className="hint">{hint}</div> : null}
    </>
  )
}
