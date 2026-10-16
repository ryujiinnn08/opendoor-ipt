import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/authContext.js'
import { useDisplaySettings } from '../../display/displayContext.js'
import { buttonClasses } from '../ui/buttonLinkStyles.js'

/**
 * Once the job's title scrolls out of sight, a slim bar at the top keeps the title and the Apply
 * action in reach (UI_FEEDBACK_PLAN §2, LinkedIn's job page). It is turned off at 150 % text and
 * more, where it would cover too much, and while it shows the page scrolls focused elements clear
 * of it (WCAG 2.4.11). It comes last in the page, so it never changes the tab order above it.
 */
export default function StickyApplyBar({ job }) {
  const { role } = useAuth()
  const { settings } = useDisplaySettings()
  const [titleGone, setTitleGone] = useState(false)
  const allowed = settings.text < 150

  const applyPath = `/candidate/jobs/${job.id}/apply`
  const action = !role
    ? { to: `/login?next=${encodeURIComponent(applyPath)}`, label: 'Log in to apply' }
    : role === 'candidate' && job.my_application
      ? { to: `/candidate/applications/${job.my_application.id}`, label: 'View your application' }
      : role === 'candidate'
        ? { to: applyPath, label: 'Apply for this job' }
        : null

  const hasAction = action !== null
  useEffect(() => {
    const title = document.querySelector('main h1')
    if (!allowed || !hasAction || !title || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setTitleGone(!entry.isIntersecting && entry.boundingClientRect.top < 0))
    observer.observe(title)
    return () => observer.disconnect()
  }, [allowed, hasAction])

  const shown = allowed && action && titleGone

  useEffect(() => {
    if (!shown) return
    const root = document.documentElement
    root.style.scrollPaddingTop = '5.5rem'
    return () => {
      root.style.scrollPaddingTop = ''
    }
  }, [shown])

  if (!shown) return null

  return (
    <div role="region" aria-label="Quick apply" className="fixed inset-x-0 top-0 z-30 animate-reveal border-b border-border bg-surface shadow-[0_6px_16px_rgba(36,27,58,0.1)] print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <div className="min-w-0">
          <p className="truncate font-display font-semibold">{job.title}</p>
          <p className="truncate text-sm text-muted">{job.employer.name}</p>
        </div>
        <Link to={action.to} className={`${buttonClasses('primary', 'sm')} shrink-0`}>
          {action.label}
        </Link>
      </div>
    </div>
  )
}
