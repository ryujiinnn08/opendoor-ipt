import { useState } from 'react'
import ChartFrame from './ChartFrame.jsx'
import { rootPx, useWidth } from './chartGeometry.js'
import Tooltip from './Tooltip.jsx'

/**
 * Horizontal bars split into parts (e.g., each job's applicants by status), one row per item with
 * its name above the bar and its total at the end. Parts are separated by a 2 px gap in the card
 * colour; the legend names them in words.
 *
 * rows: [{ label, values: [n per series] }]; series: [{ key, label, color }]
 */
export default function StackedBarChart({ title, summary, rows, series, unit }) {
  const [ref, width] = useWidth()
  const [tip, setTip] = useState(null)
  const px = rootPx()
  const font = 0.8125 * px
  const barH = 16
  const rowH = font * 1.4 + barH + 14
  const totals = rows.map((row) => row.values.reduce((sum, value) => sum + value, 0))
  const max = Math.max(...totals, 1)
  const plotW = Math.max(width - font * 3, 40)
  const height = rows.length * rowH

  return (
    <ChartFrame
      title={title}
      summary={summary}
      series={series}
      table={{ columns: ['Job', ...series.map((item) => item.label), 'Total'], rows: rows.map((row, i) => [row.label, ...row.values, totals[i]]) }}
    >
      <div ref={ref} className="relative" onMouseLeave={() => setTip(null)}>
        <svg width={width} height={height} className="block overflow-visible">
          {rows.map((row, r) => {
            const top = r * rowH
            const barY = top + font * 1.4
            let x = 0
            return (
              <g key={row.label}>
                <text x={0} y={top + font} fontSize={font} fill="var(--od-text-default)">
                  {row.label.length > 48 ? `${row.label.slice(0, 47)}…` : row.label}
                </text>
                <rect x={0} y={barY} width={plotW} height={barH} rx="4" fill="var(--od-surface-subtle)" />
                {row.values.map((value, s) => {
                  if (value === 0) return null
                  const w = (value / max) * plotW
                  const part = <rect key={series[s].key} x={x} y={barY} width={Math.max(w - 2, 2)} height={barH} rx="3" fill={series[s].color} />
                  x += w
                  return part
                })}
                <text x={(totals[r] / max) * plotW + 6} y={barY + barH / 2} dy="0.32em" fontSize={font} fontWeight="700" fill="var(--od-text-default)">
                  {totals[r]}
                </text>
                <rect
                  x={0}
                  y={top}
                  width={width}
                  height={rowH}
                  fill="transparent"
                  onMouseEnter={() =>
                    setTip({
                      x: Math.min((totals[r] / max) * plotW, plotW) / 2,
                      y: barY,
                      title: row.label,
                      lines: series.map((item, s) => `${item.label}: ${row.values[s]}`).concat(`${totals[r]} ${totals[r] === 1 ? unit[0] : unit[1]}`),
                    })
                  }
                />
              </g>
            )
          })}
        </svg>
        <Tooltip tip={tip} />
      </div>
    </ChartFrame>
  )
}
