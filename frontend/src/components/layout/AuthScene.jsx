import { lazy, Suspense } from 'react'

// Only Log in and Create account show the door, so its drawing loads with them, not with every page.
const MascotDoor = lazy(() => import('../mascot/MascotDoor.jsx'))

/**
 * Log in and Create account: the form, and beside it on wide screens the mascot opening his door
 * and waving hello (mascot-door-login, animation only; OpenDoor's own page layout). Decoration
 * only: hidden from screen readers, gone in Quiet mode and below 1024 px, still with Reduce motion,
 * and never over the form.
 */
export default function AuthScene({ children }) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">{children}</div>
      <div aria-hidden="true" className="od-decoration hidden lg:block">
        <Suspense fallback={null}>
          <MascotDoor />
        </Suspense>
      </div>
    </div>
  )
}
