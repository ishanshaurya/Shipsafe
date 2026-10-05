import { useState } from "react"
import { importRepo, listRepoFiles, fetchRepoFiles } from "./githubImport"

/**
 * State and handlers for the RepoImport picker, shared by Debugger and Audit.
 * `onImported(data, repo)` runs after a quick import or a picked-files import;
 * `data` is the server payload (`data.code` is the combined source).
 * Returns `{ repoProps }` to spread onto <RepoImport>, next to the page's own labels.
 */
export function useRepoImport({ onImported }) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(null)
  const [fileList, setFileList] = useState(null)     // null = not fetched, [] = fetched
  const [selected, setSelected] = useState([])       // paths of checked files
  const [repo, setRepo] = useState(null)             // repo info from the list call

  // Quick path: server auto-selects files and returns their combined code.
  const quick = async () => {
    if (!url.trim() || loading) return
    setLoading(true); setError(null); setInfo(null); setFileList(null)
    const { data, error: importError } = await importRepo(url)
    setLoading(false)
    if (importError) { setError(importError); return }
    onImported(data, data.repo)
    setInfo(data)
  }

  // Picker step 1: file tree only, recommended files pre-checked.
  const choose = async () => {
    if (!url.trim() || loading) return
    setLoading(true); setError(null); setInfo(null); setFileList(null)
    const { data, error: listError } = await listRepoFiles(url)
    setLoading(false)
    if (listError) { setError(listError); return }
    setFileList(data.files)
    setRepo(data.repo)
    setSelected(data.files.filter((f) => f.autoSelected).map((f) => f.path))
  }

  // Picker step 2: fetch only the checked files.
  const scanSelected = async () => {
    if (!selected.length || loading) return
    setLoading(true); setError(null)
    const { data, error: fetchError } = await fetchRepoFiles(url, selected)
    setLoading(false)
    if (fetchError) { setError(fetchError); return }
    onImported(data, repo)
    setInfo(data)
    setFileList(null)
  }

  return {
    repoProps: {
      url,
      onUrl: (v) => { setUrl(v); setError(null); setFileList(null) },
      onChoose: choose,
      onQuick: quick,
      loading,
      fileList,
      selected,
      onSelected: setSelected,
      repo,
      onScan: scanSelected,
      onCancel: () => setFileList(null),
      error,
      onDismissError: () => setError(null),
      info,
    },
  }
}
