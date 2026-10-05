// The only module that reads or writes the reports table.
// All functions return { data, error }, mirroring Supabase.

import { supabase } from "../../shared/supabaseClient"

// ─────────────────────────────────────────────
// REPORTS
// Table: reports
// Columns: id (uuid), user_id, slug (unique), title,
//          scan_type, result_data (jsonb), is_public (bool), created_at
// ─────────────────────────────────────────────

/**
 * Save a shareable public report.
 *
 * Called when user clicks "Generate Public Report" on any tool page.
 * The slug becomes the URL: /report/:slug
 *
 * @param {string} userId
 * @param {string} slug        - Unique URL-safe string (e.g. "abc123")
 * @param {string} title       - Report title
 * @param {string} scanType    - Which tool generated this
 * @param {object} resultData  - The full scan result object
 * @param {boolean} isPublic   - Whether anyone with the link can view it
 *
 * @returns {{ data: object|null, error: object|null }}
 */
export async function saveReport(userId, slug, title, scanType, resultData, isPublic = true) {
  try {
    const { data, error } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        slug,
        title,
        scan_type: scanType,
        result_data: resultData,
        is_public: isPublic,
      })
      .select()
      .single()

    if (error) {
      console.error("[supabaseService] saveReport failed:", error.message)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error("[supabaseService] saveReport threw:", err)
    return { data: null, error: err }
  }
}

/**
 * Fetch a public report by its slug.
 *
 * Used by /report/:slug — works without auth (is_public = true).
 *
 * @param {string} slug
 *
 * @returns {{ data: object|null, error: object|null }}
 */
export async function getReportBySlug(slug) {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("slug", slug)
      .eq("is_public", true)
      .single()

    if (error) {
      console.error("[supabaseService] getReportBySlug failed:", error.message)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error("[supabaseService] getReportBySlug threw:", err)
    return { data: null, error: err }
  }
}
