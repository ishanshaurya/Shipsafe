import { useId } from "react"
import { Loader2 } from "lucide-react"
import Notice from "../../shared/components/Notice"

const formatSize = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`)

function Busy({ loading, children }) {
  return loading ? <><Loader2 size={16} className="spin" aria-hidden="true" /> {children}</> : children
}

// GitHub import with the two-step file picker. Shared by Debugger and Audit; each page keeps its own fetch logic.
export default function RepoImport({
  url, onUrl, onChoose, onQuick, quickLabel, scanLabel,
  loading, fileList, selected, onSelected, repo, onScan, onCancel,
  error, onDismissError, info,
}) {
  const id = useId()
  const hasUrl = !!url.trim()
  const totalSize = fileList
    ? fileList.filter((f) => selected.includes(f.path)).reduce((s, f) => s + f.size, 0)
    : 0
  const allSelected = fileList && selected.length === fileList.length

  return (
    <div>
      <label className="label" htmlFor={id}>Import from GitHub</label>
      <div className="field-row">
        <input
          id={id} className="field" value={url} placeholder="https://github.com/owner/repo"
          onChange={(e) => onUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onChoose()}
        />
        <button type="button" className="btn btn-secondary" onClick={onChoose} disabled={loading || !hasUrl}>
          <Busy loading={loading && !fileList}>Choose files</Busy>
        </button>
      </div>
      <div style={{ marginTop: 8 }}>
        <button type="button" className="link-btn" onClick={onQuick} disabled={loading || !hasUrl} style={{ opacity: loading || !hasUrl ? 0.5 : 1 }}>
          {quickLabel}
        </button>
      </div>

      {fileList && (
        <div className="panel picker">
          <div className="panel-head">
            <div>
              <div style={{ fontWeight: 600 }}>{repo?.name}</div>
              <div className="small muted">{fileList.length} files found</div>
            </div>
            <div className="inline">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSelected(fileList.filter((f) => f.autoSelected).map((f) => f.path))}>Select recommended</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSelected(allSelected ? [] : fileList.map((f) => f.path))}>
                {allSelected ? "Clear selection" : "Select all"}
              </button>
            </div>
          </div>
          <div className="picker-list">
            {fileList.map((f) => {
              const checked = selected.includes(f.path)
              return (
                <label key={f.path} className="picker-file">
                  <input type="checkbox" checked={checked} onChange={() => onSelected(checked ? selected.filter((x) => x !== f.path) : [...selected, f.path])} />
                  <span className="picker-path" title={f.path}>{f.path}</span>
                  {f.autoSelected && <span className="small muted">Recommended</span>}
                  <span className="small muted">{formatSize(f.size)}</span>
                </label>
              )
            })}
          </div>
          <div className="picker-foot">
            <span className="small">
              {selected.length} {selected.length === 1 ? "file" : "files"} selected{totalSize > 0 && ` (${formatSize(totalSize)})`}
            </span>
            <div className="inline">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={onScan} disabled={!selected.length || loading}>
                <Busy loading={loading}>{scanLabel}</Busy>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ marginTop: 12 }}><Notice tone="error" title="Import failed" onDismiss={onDismissError}>{error}</Notice></div>}
      {info && !fileList && (
        <div style={{ marginTop: 12 }}>
          <Notice>
            Imported {info.fileCount} files ({info.totalLines} lines) from {info.repo.name}, {info.repo.stars.toLocaleString()} stars.
          </Notice>
        </div>
      )}
    </div>
  )
}
