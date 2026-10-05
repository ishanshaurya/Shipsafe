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
import { withLog } from "./_lib/log.js"
import { checkRateLimit } from "./_lib/rateLimit.js"
import { generateEmbedding } from "./_lib/providers.js"
import { isEmbedding, MAX_TEXT_CHARS, clampSimilarLimit } from "./_lib/validate.js"

// One scan makes ~3 calls (generate, similar, save).
const RATE_LIMIT_MAX = 60

// Service role bypasses RLS, so every query below filters on the verified
// user.id explicitly. Without it, fall back to the caller-scoped client.
function dbClient(userClient) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  return serviceKey ? createClient(url, serviceKey) : userClient
}

export default withLog("embed", async function handler(req, res, log) {
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

  log.setAction(req.body?.action)
  const { user, supabase: userClient } = await log.time("auth", () => verifyUser(req))
  if (!user) return res.status(401).json({ error: "Sign in required" })
  log.setUser(user)

  const limit = await checkRateLimit(userClient, { bucket: "embed", max: RATE_LIMIT_MAX, errorStatus: 502, log })
  if (!limit.ok) return res.status(limit.status).json({ error: limit.error })

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) return res.status(500).json({ error: "Service unavailable" })

  const { action } = req.body || {}

  // ─── Generate embedding from text ──────────────────────
  if (action === "generate") {
    const { text } = req.body
    if (!text || typeof text !== "string") return res.status(400).json({ error: "No text provided" })
    if (text.length > MAX_TEXT_CHARS) return res.status(400).json({ error: "Text too large" })

    try {
      const embedding = await log.time("embed", () => generateEmbedding(text, geminiKey), { provider: "gemini" })
      return res.status(200).json({ embedding })
    } catch (err) {
      log.error("embed_generate", err)
      return res.status(502).json({ error: "Embedding unavailable" })
    }
  }

  // ─── Find similar scans ────────────────────────────────
  if (action === "similar") {
    const { embedding, currentScanId, limit = 5 } = req.body
    if (!isEmbedding(embedding)) {
      return res.status(400).json({ error: "Valid embedding required" })
    }
    const matchCount = clampSimilarLimit(limit)

    try {
      // pgvector cosine distance search, scoped by match_scans to auth.uid()
      // <=> is the cosine distance operator (0 = identical, 2 = opposite)
      const { data, error } = await log.time("db", () =>
        userClient.rpc("match_scans", {
          query_embedding: embedding,
          exclude_scan_id: currentScanId || null,
          match_threshold: 0.4, // cosine distance threshold (lower = more similar)
          match_count: matchCount,
        })
      )

      if (error) {
        log.error("similar", error)
        return res.status(502).json({ error: "Similarity search unavailable" })
      }

      return res.status(200).json({ similar: data || [] })
    } catch (err) {
      log.error("similar", err)
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

      const { error } = await log.time("db", () =>
        supabase
          .from("scan_history")
          .update({ embedding })
          .eq("id", scanId)
          .eq("user_id", user.id)
      )

      if (error) {
        log.error("save", error)
        return res.status(502).json({ error: "Embedding save failed" })
      }

      return res.status(200).json({ success: true })
    } catch (err) {
      log.error("save", err)
      return res.status(502).json({ error: "Embedding save failed" })
    }
  }

  return res.status(400).json({ error: "Invalid action. Use: generate, similar, or save" })
})
