import { Link } from 'react-router-dom'
import IconTile from './IconTile.jsx'

/**
 * The Figma StatTile: an icon tile, a big number and its label, and an optional "View" link.
 * Rendered as an <li>, so put it in a <ul>. The link's accessible name says what it opens
 * ("View submitted applications"), because several tiles on a page each have a "View".
 */
export default function StatTile({ count, label, icon, tone, to, linkLabel }) {
  return (
    <li className="flex flex-col rounded-lg border-2 border-border bg-surface p-5">
      {icon && <IconTile icon={icon} tone={tone} />}
      <p className="mt-3 flex flex-col">
        <span className="font-display text-stat font-bold text-accent">{count}</span>
        <span className="mt-1 font-bold">{label}</span>
      </p>
      {to && (
        <Link
          to={to}
          aria-label={linkLabel}
          className="mt-2 inline-flex min-h-11 items-center self-start text-sm font-bold text-primary underline underline-offset-4 hover:no-underline"
        >
          View
        </Link>
      )}
    </li>
  )
}
