// Scan history and similar-scan embeddings.
//
// The only module that reads or writes the scan_history table.
// All functions return { data, error }, mirroring Supabase, so callers handle errors uniformly.

import { supabase } from "../../shared/supabaseClient"
import { authHeader } from "../../shared/authHeader"

// ─────────────────────────────────────────────
// SCAN HISTORY
// Table: scan_history
// Columns: id, user_id, scan_type, input_snippet, result (jsonb), score, created_at
// ─────────────────────────────────────────────

/**
 * Save a completed scan to the database.
 *
 * Called by runScan() after every successful AI response.
 * Only runs when a user is logged in (caller should check user first).
 *
 * @param {string} userId        - The logged-in user's UUID (from Supabase Auth)
 * @param {string} scanType      - One of: "debugger" | "audit" | "loopholes"
 * @param {string} inputSnippet  - First 500 chars of the user's input (code, description, etc.)
 * @param {object} result        - The full parsed AI response object (stored as jsonb)
 * @param {number|null} score    - 0-100 health/readiness score, or null if the tool doesn't produce one
 *
 * @returns {{ data: object|null, error: object|null }}
 */
export async function saveScan(userId, scanType, inputSnippet, result, score) {
  try {
    const { data, error } = await supabase
      .from("scan_history")
      .insert({
        user_id: userId,
        scan_type: scanType,
        input_snippet: inputSnippet?.slice(0, 500) ?? "",
        result: result,
        score: score ?? null,
      })
      .select()  // returns the inserted row so callers can use the id if needed

    if (error) {
      console.error("[supabaseService] saveScan failed:", error.message)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error("[supabaseService] saveScan threw:", err)
    return { data: null, error: err }
  }
}

/**
 * Fetch the most recent scans for a user.
 *
 * Called by Dashboard to populate the "Recent Scans" panel.
 * Returns the 10 most recent rows, newest first.
 *
 * @param {string} userId  - The logged-in user's UUID
 * @param {number} limit   - How many rows to return (default: 10)
 *
 * @returns {{ data: Array|null, error: object|null }}
 */
export async function getScanHistory(userId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from("scan_history")
      .select("id, scan_type, input_snippet, result, score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[supabaseService] getScanHistory failed:", error.message)
      return { data: null, error }
    }

    return { data: data ?? [], error: null }
  } catch (err) {
    console.error("[supabaseService] getScanHistory threw:", err)
    return { data: null, error: err }
  }
}


export function embeddingText(scanType, result) {
  const issueTitles = (result.issues || []).map(i => i.title).filter(Boolean).join(", ")
  return `${scanType}: ${result.summary || ""}. Issues: ${issueTitles}`
}

/**
 * Generate and save an embedding for a scan row. Fire-and-forget — never throws.
 *
 * @param {string} scanId    - UUID of the saved scan_history row
 * @param {string} scanType  - e.g. "debugger"
 * @param {object} result    - Parsed AI result object (must have .summary and .issues[].title)
 */
export async function attachEmbedding(scanId, scanType, result) {
  try {
    const text = embeddingText(scanType, result)
    const auth = await authHeader()

    const genRes = await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ action: "generate", text }),
    })
    if (!genRes.ok) return

    const { embedding } = await genRes.json()
    if (!embedding) return

    await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ action: "save", scanId, embedding }),
    })
  } catch (err) {
    console.error("[supabaseService] attachEmbedding failed (non-fatal):", err)
  }
}
