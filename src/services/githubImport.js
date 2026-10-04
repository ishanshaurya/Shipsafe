// src/services/githubImport.js
//
// THE ONLY FILE IN THE APP THAT CALLS /api/github.
//
// Three request shapes, one wrapper. Callers never see mode strings or
// parse JSON. Every function returns:
//   { data: <server payload | null>, error: <string | null>, aborted?: true }
// and never throws. `aborted` means the caller's signal fired — ignore it.

import { authHeader } from "./supabaseService.js"

async function post(body, fallbackError, signal) {
  let res
  try {
    res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err?.name === "AbortError") return { data: null, error: null, aborted: true }
    return { data: null, error: "Network error — could not reach GitHub" }
  }

  let data
  try {
    data = await res.json()
  } catch {
    // Platform errors (e.g. a Vercel 504 timeout) return HTML, not JSON.
    return {
      data: null,
      error: res.status >= 500
        ? "GitHub import timed out — try again or pick fewer files"
        : "Unexpected response from the server",
    }
  }

  if (!res.ok) return { data: null, error: data?.error || fallbackError }
  return { data, error: null }
}

// Quick path: server auto-selects files and returns the combined code.
export function importRepo(url, { signal } = {}) {
  return post({ url: url.trim() }, "Failed to fetch repo", signal)
}

// Picker step 1: file metadata only, `autoSelected` marks recommended files.
// TODO: list mode only returns the ≤25 smartSelect() files, never the full tree — see docs/planning/api/github-import.md
export function listRepoFiles(url, { signal } = {}) {
  return post({ url: url.trim(), mode: "list" }, "Failed to fetch repo", signal)
}

// Picker step 2: fetch combined code for the chosen paths.
export function fetchRepoFiles(url, paths, { signal } = {}) {
  return post({ url: url.trim(), files: paths }, "Failed to fetch files", signal)
}
