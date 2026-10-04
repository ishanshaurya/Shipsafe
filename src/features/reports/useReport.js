// src/hooks/useReport.js
//
// Reusable hook for generating a public shareable report from any tool page.
// Usage:
//   const { generating, reportUrl, reportError, generateReport } = useReport()
//   generateReport({ scanType: "debugger", title: "My scan", resultData: result })
//
// After calling generateReport(), reportUrl becomes the shareable /report/:slug URL.

import { useState } from "react"
import { useAuth } from "../auth/useAuth"
import { saveReport } from "./reportService"

function makeSlug() {
  // 16 hex chars from a CSPRNG — public report links must not be guessable
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

export function useReport() {
  const { user } = useAuth()
  const [generating, setGenerating] = useState(false)
  const [reportUrl, setReportUrl] = useState(null)
  const [reportError, setReportError] = useState(null)

  const generateReport = async ({ scanType, title, resultData }) => {
    if (!user) {
      setReportError("Sign in to generate a shareable report")
      return
    }
    if (!resultData) {
      setReportError("Run a scan first before generating a report")
      return
    }

    setGenerating(true)
    setReportError(null)
    setReportUrl(null)

    let data, error

    // Retry up to 3 times on slug collision
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = makeSlug()
      ;({ data, error } = await saveReport(
        user.id,
        slug,
        title || `${scanType} scan`,
        scanType,
        resultData,
        true
      ))

      // 23505 = Supabase unique constraint violation — try a new slug
      if (!error || error.code !== "23505") break
    }

    if (error) {
      setReportError("Failed to save report. Try again.")
    } else {
      setReportUrl(`${window.location.origin}/report/${data.slug}`)
    }

    setGenerating(false)
  }

  const reset = () => {
    setReportUrl(null)
    setReportError(null)
  }

  return { generating, reportUrl, reportError, generateReport, reset }
}
