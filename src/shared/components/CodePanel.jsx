import { useId, useState } from "react"
import Button from "../ui/Button"

function useCopied() {
  const [copied, setCopied] = useState(false)
  const copy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return [copied, copy]
}

// Editable code surface on ink. `right` renders in the title bar next to the optional copy button.
export default function CodePanel({ label, value, onChange, placeholder, lineNumbers = false, copy = false, right }) {
  const id = useId()
  const [copied, doCopy] = useCopied()
  const lines = value.split("\n").length

  return (
    <div className="codepanel">
      <div className="codepanel-bar">
        <label htmlFor={id}>{label}</label>
        <span className="inline">
          {right}
          {copy && (
            <Button variant="onink" size="sm" onClick={() => doCopy(value)}>
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
        </span>
      </div>
      <div className="codepanel-body">
        {lineNumbers && (
          <div className="codepanel-gutter" aria-hidden="true">
            {Array.from({ length: Math.max(lines, 20) }, (_, i) => <div key={i}>{i + 1}</div>)}
          </div>
        )}
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} spellCheck={false} />
      </div>
    </div>
  )
}

// Read-only fix with a copy button.
export function FixPanel({ text }) {
  const [copied, doCopy] = useCopied()
  return (
    <div className="codepanel">
      <div className="codepanel-bar">
        <span>Fix</span>
        <Button variant="onink" size="sm" onClick={() => doCopy(text)}>
          {copied ? "Copied" : "Copy fix"}
        </Button>
      </div>
      <div className="codepanel-ro"><pre>{text}</pre></div>
    </div>
  )
}

// Read-only snippet, no title bar.
export function CodeSnippet({ text }) {
  return (
    <div className="codepanel codepanel-ro"><pre>{text}</pre></div>
  )
}
