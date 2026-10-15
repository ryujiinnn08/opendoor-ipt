import { NavLink } from 'react-router-dom'

/**
 * "Notifications (3)" in the header (plan PHASE_6 Q8): a word people can say and screen readers
 * read, not an icon-only bell or a pop-up. No number at 0. The bell before the word is
 * decorative, drawn to match the Icons8 line icons.
 */
export default function NotificationsLink({ count }) {
  return (
    <NavLink
      to="/notifications"
      className={({ isActive }) =>
        `inline-flex min-h-11 items-center gap-1.5 font-bold text-primary underline underline-offset-4 hover:no-underline ${isActive ? 'decoration-2' : ''}`
      }
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5Z" />
        <path d="M10 20.5a2 2 0 0 0 4 0" />
      </svg>
      {/* One span, so the space before the count survives inside the flex link. */}
      <span>
        Notifications
        {count > 0 && (
          <>
            {' '}({count}
            <span className="sr-only"> unread</span>)
          </>
        )}
      </span>
    </NavLink>
  )
}
