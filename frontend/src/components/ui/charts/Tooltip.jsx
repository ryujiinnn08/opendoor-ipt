/** The hover note over a chart mark (pointer only; the same numbers are in the table view). */
export default function Tooltip({ tip }) {
  if (!tip) return null
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-3 py-2 text-sm whitespace-nowrap shadow-[0_8px_20px_rgba(36,27,58,0.16)]"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="font-bold">{tip.title}</p>
      {tip.lines.map((line) => (
        <p key={line} className="text-muted">
          {line}
        </p>
      ))}
    </div>
  )
}
