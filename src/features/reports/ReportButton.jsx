// src/components/ReportButton.jsx
//
// Drop this into any tool page's result panel.
// Props:
//   scanType   — "debugger" | "audit" | "loopholes"
//   title      — human-readable report title
//   resultData — the full scan result object (button is hidden if null)

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useReport } from "./useReport"
import Notice from "../../shared/ui/Notice"

export default function ReportButton({ scanType, title, resultData }) {
  const { generating, reportUrl, reportError, generateReport } = useReport()
  const [copied, setCopied] = useState(false)

  if (!resultData) return null

  const copy = () => {
    navigator.clipboard.writeText(reportUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (reportUrl) {
    return (
      <div className="panel" style={{ padding: 16 }} role="status">
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Report link created</div>
        <div className="field-row">
          <input className="field mono" readOnly value={reportUrl} aria-label="Report link" onFocus={(e) => e.target.select()} style={{ fontSize: 14 }} />
          <button type="button" className="btn btn-secondary" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={() => generateReport({ scanType, title, resultData })}
        disabled={generating}
      >
        {generating && <Loader2 size={16} className="spin" aria-hidden="true" />}
        Create report link
      </button>
      {reportError && <Notice tone="error" title="Couldn't create the report link">{reportError}</Notice>}
    </div>
  )
}
