// Regulation Explorer data: asks the AI for regulations on a topic, normalizes the shape,
// and falls back to a flagged sample result when the call fails.

import { authHeader } from "../../shared/authHeader.js"
import { mockRegulationResult } from "./mockRegulation.js"

const _regulationsCache = new Map()

function isValidUrl(str) {
  try { return ["http:", "https:"].includes(new URL(str).protocol) } catch { return false }
}

function normalizeRegulation(r) {
  return {
    name: r.name || "Unknown Regulation",
    country: r.country || "Unknown",
    year: r.year || null,
    status: r.status || "Unknown",
    summary: r.summary || "No summary available",
    source_url: isValidUrl(r.source_url) ? r.source_url : null,
    sectors: Array.isArray(r.sectors) ? r.sectors : [],
    risk: {
      description: r.risk?.description || "Not specified",
      severity: ["High", "Medium", "Low"].includes(r.risk?.severity) ? r.risk.severity : "Medium",
      who_is_at_risk: Array.isArray(r.risk?.who_is_at_risk) ? r.risk.who_is_at_risk : [],
    },
    developer_checklist: Array.isArray(r.developer_checklist) ? r.developer_checklist : [],
  }
}

export async function fetchRegulations(topic) {
  const key = topic.toLowerCase().trim()
  if (_regulationsCache.has(key)) return _regulationsCache.get(key)

  const userPrompt = `Topic: ${topic}

Return JSON matching this exact shape:
{
  "topic": "${topic}",
  "regulations": [
    {
      "name": string,
      "country": string,
      "year": number | null,
      "status": "Active" | "Draft" | "Proposed" | "Repealed" | "Unknown",
      "summary": string,
      "source_url": string,
      "sectors": string[],
      "risk": {
        "description": string,
        "severity": "High" | "Medium" | "Low",
        "who_is_at_risk": string[]
      },
      "developer_checklist": string[]
    }
  ],
  "country_coverage": {
    "regulated": string[],
    "draft": string[],
    "unregulated": string[]
  },
  "overall_severity": "High" | "Medium" | "Low"
}`

  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ tool: "regulations", userPrompt }),
    })

    if (!response.ok) throw new Error(`Server error: ${response.status}`)

    const data = await response.json()
    let raw = (data.content || "").replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
    const parsed = JSON.parse(raw)

    const regsArray = Array.isArray(parsed) ? parsed : (parsed.regulations || [])
    const seen = new Map()
    regsArray.forEach(r => {
      const nameKey = (r.name || "").toLowerCase()
      if (nameKey && !seen.has(nameKey)) seen.set(nameKey, normalizeRegulation(r))
    })

    const result = {
      regulations: Array.from(seen.values()),
      country_coverage: parsed.country_coverage ?? null,
      overall_severity: parsed.overall_severity ?? null,
    }

    _regulationsCache.set(key, result)
    return result

  } catch (err) {
    console.error("[regulationsService] fetchRegulations failed:", err)
    return mockRegulationResult
  }
}
