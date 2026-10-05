import Badge from "../../shared/ui/Badge"
import Button from "../../shared/ui/Button"
import Card from "../../shared/ui/Card"
import ErrorState from "../../shared/ui/ErrorState"
import Field from "../../shared/ui/Field"
import Notice from "../../shared/ui/Notice"

const formatSize = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`)

// GitHub import with the two-step file picker. Shared by Debugger and Audit; state comes from useRepoImport.
export default function RepoImport({
  url, onUrl, onChoose, onQuick, quickLabel, scanLabel,
  loading, fileList, selected, onSelected, repo, onScan, onCancel,
  error, onDismissError, onRetry, info,
}) {
  const hasUrl = !!url.trim()
  const totalSize = fileList
    ? fileList.filter((f) => selected.includes(f.path)).reduce((s, f) => s + f.size, 0)
    : 0
  const allSelected = fileList && selected.length === fileList.length

  return (
    <div>
      <Field
        label="Import from GitHub" value={url} placeholder="https://github.com/owner/repo"
        onChange={(e) => onUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onChoose()}
        action={
          <Button variant="secondary" onClick={onChoose} loading={loading && !fileList} disabled={loading || !hasUrl}>Choose files</Button>
        }
      />
      <div style={{ marginTop: 8 }}>
        <button type="button" className="link-btn" onClick={onQuick} disabled={loading || !hasUrl} style={{ opacity: loading || !hasUrl ? 0.5 : 1 }}>
          {quickLabel}
        </button>
      </div>

      {fileList && (
        <Card className="picker">
          <div className="panel-head">
            <div>
              <div style={{ fontWeight: 600 }}>{repo?.name}</div>
              <div className="small muted">{fileList.length} files found</div>
            </div>
            <div className="inline">
              <Button variant="ghost" size="sm" onClick={() => onSelected(fileList.filter((f) => f.autoSelected).map((f) => f.path))}>Select recommended</Button>
              <Button variant="ghost" size="sm" onClick={() => onSelected(allSelected ? [] : fileList.map((f) => f.path))}>
                {allSelected ? "Clear selection" : "Select all"}
              </Button>
            </div>
          </div>
          <div className="picker-list">
            {fileList.map((f) => {
              const checked = selected.includes(f.path)
              return (
                <label key={f.path} className="picker-file">
                  <input type="checkbox" checked={checked} onChange={() => onSelected(checked ? selected.filter((x) => x !== f.path) : [...selected, f.path])} />
                  <span className="picker-path" title={f.path}>{f.path}</span>
                  {f.autoSelected && <Badge>Recommended</Badge>}
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
              <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
              <Button size="sm" onClick={onScan} loading={loading} disabled={!selected.length}>{scanLabel}</Button>
            </div>
          </div>
        </Card>
      )}

      {error && <div style={{ marginTop: 12 }}><ErrorState title="Import failed" onRetry={onRetry} onDismiss={onDismissError}>{error}</ErrorState></div>}
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
