import { useState } from 'react'
import ChartFrame from './ChartFrame.jsx'
import { niceMax, rootPx, useWidth } from './chartGeometry.js'
import Tooltip from './Tooltip.jsx'

/**
 * One to four weekly series as 2 px lines on one axis, with 8 px dots ringed in the card colour,
 * the latest value labelled at each line's end, and a crosshair note on hover.
 *
 * labels / names: per week; series: [{ key, label, color, values }]
 */
export default function LineChart({ title, summary, labels, names, series }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const px = rootPx()
  const font = 0.8125 * px
  const pad = { top: font, right: font * 2.2, bottom: font * 2, left: font * 2.4 }
  const height = 11 * px
  const plotW = Math.max(width - pad.left - pad.right, 40)
  const plotH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(...series.flatMap((item) => item.values), 0))
  const step = labels.length > 1 ? plotW / (labels.length - 1) : plotW
  const x = (i) => pad.left + step * i
  const y = (value) => pad.top + plotH - (value / max) * plotH
  const every = step < font * 3.2 ? 2 : 1
  const tip =
    hover === null
      ? null
      : { x: x(hover), y: pad.top, title: names[hover], lines: series.map((item) => `${item.label}: ${item.values[hover]}`) }

  return (
    <ChartFrame
      title={title}
      summary={summary}
      series={series}
      table={{ columns: ['Week', ...series.map((item) => item.label)], rows: names.map((name, i) => [name, ...series.map((item) => item.values[i])]) }}
    >
      <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
        <svg width={width} height={height} className="block overflow-visible">
          {[0, max / 2, max].map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--od-border-subtle)" strokeWidth="1" />
              <text x={pad.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={font} fill="var(--od-text-muted)">
                {tick}
              </text>
            </g>
          ))}
          {labels.map((label, i) =>
            i % every === 0 || i === labels.length - 1 ? (
              <text key={label} x={x(i)} y={height - font * 0.6} textAnchor="middle" fontSize={font} fill="var(--od-text-muted)">
                {label}
              </text>
            ) : null,
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH} stroke="var(--od-text-muted)" strokeWidth="1" />}
          {series.map((item) => (
            <g key={item.key}>
              <polyline
                points={item.values.map((value, i) => `${x(i)},${y(value)}`).join(' ')}
                fill="none"
                stroke={item.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {item.values.map((value, i) =>
                i === item.values.length - 1 || i === hover ? (
                  <circle key={i} cx={x(i)} cy={y(value)} r="4" fill={item.color} stroke="var(--od-surface-page)" strokeWidth="2" />
                ) : null,
              )}
              <text x={x(item.values.length - 1) + 8} y={y(item.values.at(-1))} dy="0.32em" fontSize={font} fontWeight="700" fill="var(--od-text-default)">
                {item.values.at(-1)}
              </text>
            </g>
          ))}
          {labels.map((label, i) => (
            <rect key={label} x={x(i) - step / 2} y={pad.top} width={step} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
        <Tooltip tip={tip} />
      </div>
    </ChartFrame>
  )
}
