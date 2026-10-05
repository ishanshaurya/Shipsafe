// src/components/ReportButton.jsx
//
// Drop this into any tool page's result panel.
// Props:
//   scanType   — "debugger" | "audit" | "loopholes"
//   title      — human-readable report title
//   resultData — the full scan result object (button is hidden if null)

import { useState } from "react"
import { useReport } from "./useReport"
import Button from "../../shared/ui/Button"
import Card from "../../shared/ui/Card"
import ErrorState from "../../shared/ui/ErrorState"

export default function ReportButton({ scanType, title, resultData }) {
  const { generating, reportUrl, reportError, generateReport } = useReport()
  const [copied, setCopied] = useState(false)

  if (!resultData) return null

  const create = () => generateReport({ scanType, title, resultData })

  const copy = () => {
    navigator.clipboard.writeText(reportUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (reportUrl) {
    return (
      <Card style={{ padding: 16 }} role="status">
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Report link created</div>
        <div className="field-row">
          <input className="field mono" readOnly value={reportUrl} aria-label="Report link" onFocus={(e) => e.target.select()} style={{ fontSize: 14 }} />
          <Button variant="secondary" onClick={copy}>{copied ? "Copied" : "Copy link"}</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <Button variant="secondary" block onClick={create} loading={generating}>Create report link</Button>
      {reportError && <ErrorState title="Couldn't create the report link" onRetry={create}>{reportError}</ErrorState>}
    </div>
  )
}
