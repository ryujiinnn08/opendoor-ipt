import { NavLink } from 'react-router-dom'

/**
 * "Notifications (3)" in the header (plan PHASE_6 Q8): a word people can say and screen readers
 * read, not an icon-only bell or a pop-up. No number at 0.
 */
export default function NotificationsLink({ count }) {
  return (
    <NavLink
      to="/notifications"
      className={({ isActive }) =>
        `inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 hover:no-underline ${isActive ? 'decoration-2' : ''}`
      }
    >
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
