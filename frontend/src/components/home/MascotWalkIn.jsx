import Mascot from './Mascot.jsx'

/**
 * Log in and Create account (UI_FEEDBACK_WAVE_B_PLAN B5): the form, and beside it on wide screens
 * the mascot walking in from the side, then waving once and standing still (Q5). Decoration only:
 * hidden from screen readers, gone in Quiet mode and below 1024 px, standing still with Reduce
 * motion, and never over the form.
 */
export default function MascotWalkIn({ children }) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0">{children}</div>
      <div aria-hidden="true" className="od-decoration relative isolate hidden overflow-hidden lg:block">
        <div className="absolute inset-[18%_4%_0] -z-10 rounded-full bg-primary-soft" />
        <div className="animate-mascot-walk">
          <Mascot once />
        </div>
      </div>
    </div>
  )
}
