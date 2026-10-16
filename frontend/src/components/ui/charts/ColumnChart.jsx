import { useState } from 'react'
import ChartFrame from './ChartFrame.jsx'
import { niceMax, rootPx, useWidth } from './chartGeometry.js'
import Tooltip from './Tooltip.jsx'

/** A column with a 4 px rounded top and a square base (dataviz mark spec). */
function columnPath(x, y, w, h) {
  const r = Math.min(4, h, w / 2)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

/**
 * Weekly counts as columns, one series (the title names it, so there is no legend). The latest
 * column carries its value; the axis, the hover note and the table carry the rest.
 *
 * labels: ['Oct 12', ...]; names: ['Week of October 12', ...]; values: [n, ...]; unit: [one, many]
 */
export default function ColumnChart({ title, summary, labels, names, values, unit, color = 'var(--od-chart-1)' }) {
  const [ref, width] = useWidth()
  const [tip, setTip] = useState(null)
  const px = rootPx()
  const font = 0.8125 * px
  const pad = { top: font * 1.8, right: 8, bottom: font * 2, left: font * 2.4 }
  const height = 11 * px
  const plotW = Math.max(width - pad.left - pad.right, 40)
  const plotH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(...values, 0))
  const band = plotW / values.length
  const barW = Math.min(24, band * 0.6)
  const y = (value) => pad.top + plotH - (value / max) * plotH
  const ticks = [0, max / 2, max]
  const every = band < font * 3.2 ? 2 : 1

  return (
    <ChartFrame
      title={title}
      summary={summary}
      table={{ columns: ['Week', unit[1][0].toUpperCase() + unit[1].slice(1)], rows: names.map((name, i) => [name, values[i]]) }}
    >
      <div ref={ref} className="relative" onMouseLeave={() => setTip(null)}>
        <svg width={width} height={height} className="block overflow-visible">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--od-border-subtle)" strokeWidth="1" />
              <text x={pad.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={font} fill="var(--od-text-muted)">
                {tick}
              </text>
            </g>
          ))}
          {values.map((value, i) => {
            const cx = pad.left + band * i + band / 2
            const h = Math.max((value / max) * plotH, value > 0 ? 2 : 0)
            const last = i === values.length - 1
            return (
              <g key={labels[i]}>
                {h > 0 && <path d={columnPath(cx - barW / 2, pad.top + plotH - h, barW, h)} fill={color} />}
                {last && (
                  <text x={cx} y={pad.top + plotH - h - 6} textAnchor="middle" fontSize={font} fontWeight="700" fill="var(--od-text-default)">
                    {value}
                  </text>
                )}
                {(i % every === 0 || last) && (
                  <text x={cx} y={height - font * 0.6} textAnchor="middle" fontSize={font} fill="var(--od-text-muted)">
                    {labels[i]}
                  </text>
                )}
                <rect
                  x={pad.left + band * i}
                  y={pad.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setTip({ x: cx, y: pad.top + plotH - h, title: names[i], lines: [`${value} ${value === 1 ? unit[0] : unit[1]}`] })}
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
