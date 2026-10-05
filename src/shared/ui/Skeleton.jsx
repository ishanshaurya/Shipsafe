// Placeholder bars for content that is loading. `label` is announced once;
// the bars themselves are hidden from screen readers.
export function Skeleton({ width = "100%", height }) {
  return <div className="skel" aria-hidden="true" style={{ width, height }} />
}

export function SkeletonLines({ label = "Loading", widths = ["100%", "85%", "70%"], height }) {
  return (
    <div className="stack" role="status">
      {widths.map((w, i) => <Skeleton key={i} width={w} height={height} />)}
      <span className="sr-only">{label}</span>
    </div>
  )
}
