import { Link } from 'react-router-dom'
import { TEXT_LINK } from './buttonLinkStyles.js'
import IconTile from './IconTile.jsx'

/**
 * Summary card on dashboards. With `to`, a link at the bottom; `comingSoon` marks features from
 * later phases. For a single number with a label, use StatTile.
 */
export default function DashboardTile({ title, children, to, linkLabel, count, icon, tone, comingSoon = false }) {
  return (
    <li className="flex flex-col rounded-lg border-2 border-border bg-surface p-5">
      {icon && (
        <span className="mb-3">
          <IconTile icon={icon} tone={tone} />
        </span>
      )}
      <h2 className="text-xl font-semibold">{title}</h2>
      {count !== undefined && <p className="mt-3 font-display text-stat font-bold text-accent">{count}</p>}
      <div className="mt-2 flex-1">{children}</div>
      {to && (
        <Link to={to} className={`mt-3 self-start ${TEXT_LINK}`}>
          {linkLabel ?? `Go to ${title.toLowerCase()}`}
        </Link>
      )}
      {comingSoon && <p className="mt-4 text-sm font-bold text-muted">Coming in a later update</p>}
    </li>
  )
}
