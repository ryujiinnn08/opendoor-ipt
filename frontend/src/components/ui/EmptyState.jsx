import MascotSad from '../mascot/MascotSad.jsx'

/**
 * Why a list is empty and what to do next, such as a "Clear all filters" button. With `mascot`,
 * the sad mascot sits beside the words (decoration only, hidden from screen readers).
 */
export default function EmptyState({ action, children, mascot = false }) {
  return (
    <div className={`rounded-lg border-2 border-border bg-surface p-6 ${mascot ? 'flex flex-col items-center gap-x-6 gap-y-3 text-center sm:flex-row sm:text-left' : ''}`}>
      {mascot && <MascotSad className="w-28 shrink-0" />}
      <div>
        <p className="max-w-prose text-lg">{children}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}
