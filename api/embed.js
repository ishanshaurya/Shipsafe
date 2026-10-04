// api/embed.js — Vercel Serverless Function
// Generates text embeddings via Gemini and finds similar past scans.
//
// Two modes:
//   POST { action: "generate", text: "..." } → returns embedding vector
//   POST { action: "similar", embedding: [...], limit: 5 } → returns the caller's similar scans
//   POST { action: "save", scanId, embedding } → stores the embedding on the caller's scan
// All actions require a Supabase session (Authorization: Bearer <access_token>).
//
// Uses Gemini text-embedding-004 (free, 768 dimensions)

import { createClient } from "@supabase/supabase-js"
import { verifyUser } from "./_lib/auth.js"

const EMBEDDING_MODEL = "text-embedding-004"
const EMBEDDING_DIMENSIONS = 768
const MAX_TEXT_CHARS = 10_000
const MAX_SIMILAR = 10

const isEmbedding = (v) =>
  Array.isArray(v) && v.length === EMBEDDING_DIMENSIONS && v.every((n) => typeof n === "number" && Number.isFinite(n))

// Service role bypasses RLS, so every query below filters on the verified
// user.id explicitly. Without it, fall back to the caller-scoped client.
function dbClient(userClient) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  return serviceKey ? createClient(url, serviceKey) : userClient
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://shipsafe-app.vercel.app")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "https://shipsafe-app.vercel.app")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    return res.status(200).end()
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  const { user, supabase: userClient } = await verifyUser(req)
  if (!user) return res.status(401).json({ error: "Sign in required" })

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) return res.status(500).json({ error: "Service unavailable" })

  const { action } = req.body || {}

  // ─── Generate embedding from text ──────────────────────
  if (action === "generate") {
    const { text } = req.body
    if (!text || typeof text !== "string") return res.status(400).json({ error: "No text provided" })
    if (text.length > MAX_TEXT_CHARS) return res.status(400).json({ error: "Text too large" })

    try {
      const embedding = await generateEmbedding(text, geminiKey)
      return res.status(200).json({ embedding })
    } catch (err) {
      console.error("Embedding generation failed:", err)
      return res.status(502).json({ error: "Embedding unavailable" })
    }
  }

  // ─── Find similar scans ────────────────────────────────
  if (action === "similar") {
    const { embedding, currentScanId, limit = 5 } = req.body
    if (!isEmbedding(embedding)) {
      return res.status(400).json({ error: "Valid embedding required" })
    }
    const matchCount = Math.min(Math.max(parseInt(limit, 10) || 5, 1), MAX_SIMILAR)

    try {
      const supabase = dbClient(userClient)

      // pgvector cosine distance search
      // <=> is the cosine distance operator (0 = identical, 2 = opposite)
      const { data, error } = await supabase.rpc("match_scans", {
        query_embedding: embedding,
        match_user_id: user.id,
        exclude_scan_id: currentScanId || null,
        match_threshold: 0.4, // cosine distance threshold (lower = more similar)
        match_count: matchCount,
      })

      if (error) {
        console.error("Similarity search failed:", error)
        return res.status(502).json({ error: "Similarity search unavailable" })
      }

      return res.status(200).json({ similar: data || [] })
    } catch (err) {
      console.error("Similarity search error:", err)
      return res.status(502).json({ error: "Similarity search unavailable" })
    }
  }

  // ─── Save embedding for a scan ─────────────────────────
  if (action === "save") {
    const { scanId, embedding } = req.body
    if (!scanId || typeof scanId !== "string" || !isEmbedding(embedding)) {
      return res.status(400).json({ error: "scanId and valid embedding required" })
    }

    try {
      const supabase = dbClient(userClient)

      const { error } = await supabase
        .from("scan_history")
        .update({ embedding })
        .eq("id", scanId)
        .eq("user_id", user.id)

      if (error) {
        console.error("Embedding save failed:", error)
        return res.status(502).json({ error: "Embedding save failed" })
      }

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error("Embedding save error:", err)
      return res.status(502).json({ error: "Embedding save failed" })
    }
  }

  return res.status(400).json({ error: "Invalid action. Use: generate, similar, or save" })
}

async function generateEmbedding(text, apiKey) {
  // Truncate to ~2000 chars to stay within embedding model limits
  const truncated = text.slice(0, 2000)

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text: truncated }] },
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    throw new Error(`Gemini embedding returned ${response.status}: ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  const values = data.embedding?.values

  if (!values || !Array.isArray(values)) {
    throw new Error("Gemini returned no embedding values")
  }

  return values
}
