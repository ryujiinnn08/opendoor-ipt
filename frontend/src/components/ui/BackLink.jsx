import { Link, useLocation } from 'react-router-dom'
import Icon from './Icon.jsx'

/**
 * "← Back to jobs" at the top of a detail page (UI_FEEDBACK_PLAN §3.2). It returns to the list
 * you came from with its filters: a list links to its items with `state: { backTo }` (see
 * lib/backState.js), and that address is used when it is the same list as `to`. Opened from a shared
 * link, it goes to `to`. A real link, not history.back(), so it always says where it leads.
 */
export default function BackLink({ to, children }) {
  const { state } = useLocation()
  const saved = typeof state?.backTo === 'string' ? state.backTo : null
  const href = saved && saved.split('?')[0] === to.split('?')[0] ? saved : to

  return (
    <Link
      to={href}
      className="mb-3 inline-flex min-h-11 items-center gap-1.5 font-bold text-primary underline-offset-4 hover:text-primary-hover hover:underline print:hidden"
    >
      <Icon name="arrow-left" className="size-5" />
      {children}
    </Link>
  )
}

