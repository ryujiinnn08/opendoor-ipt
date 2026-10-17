import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import { hideGetStarted, isGetStartedHidden, markCelebrated, wasCelebrated } from '../../lib/getStarted.js'
import MascotMessage from '../mascot/MascotMessage.jsx'
import MascotSad from '../mascot/MascotSad.jsx'

/**
 * The Get started checklist on a dashboard (UI_FEEDBACK_WAVE_B_PLAN B4): the first things to do,
 * each a link marked Done or To do in words and with an icon, worked out from the person's data.
 * It goes away once every step is done, or when hidden (`storageKey`, per person, in this browser).
 * Ordinary page content, not a pop-up tour, so it never traps focus or covers the page.
 */
export default function GetStarted({ steps, storageKey, intro, ready = true }) {
  const [hidden, setHidden] = useState(() => isGetStartedHidden(storageKey))
  const [celebrated] = useState(() => wasCelebrated(storageKey))
  const done = steps.filter((step) => step.done).length
  const allDone = done === steps.length
  // The first time every step is done, the happy mascot says so once; after that the card is gone.
  const celebrate = ready && allDone && !hidden && !celebrated
  useEffect(() => {
    if (celebrate) markCelebrated(storageKey)
  }, [celebrate, storageKey])

  if (celebrate) {
    return (
      <MascotMessage mood="happy" title="You're all set!" headingId="get-started-heading">
        <p>Every Get started step is done. Employers can see your details, and you&apos;re ready for what comes next.</p>
      </MascotMessage>
    )
  }
  // `ready` waits for the data the steps are worked out from, so a step never flashes as To do.
  if (!ready || hidden || allDone) return null

  function hide() {
    hideGetStarted(storageKey)
    setHidden(true)
    document.querySelector('main h1')?.focus()
  }

  return (
    <section aria-labelledby="get-started-heading" className="mt-6 rounded-lg first:mt-0 border border-border border-l-4 border-l-primary bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="get-started-heading" className="text-2xl font-bold">
              Get started
            </h2>
            <p className="text-sm font-bold text-muted">
              {done} of {steps.length} done
            </p>
          </div>
          {intro && <p className="mt-1 text-muted">{intro}</p>}
        </div>
        {/* A little sad while steps are left (decoration only). */}
        <MascotSad className="hidden w-20 shrink-0 sm:block" />
      </div>
      <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-primary-soft">
        <div className="h-full rounded-full bg-yellow" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 grid gap-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className={`mt-2.5 grid size-6 shrink-0 place-items-center rounded-full ${step.done ? 'bg-success text-on-primary' : 'border-2 border-input'}`}
            >
              {step.done && <Icon name="check" className="size-4" />}
            </span>
            <div className="min-w-0">
              {step.done ? (
                <p className="inline-flex min-h-11 items-center text-muted line-through decoration-1">
                  {step.label}
                  <span className="sr-only">: done</span>
                </p>
              ) : (
                <Link to={step.to} className="inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline">
                  {step.label}
                  <span className="sr-only">: to do</span>
                </Link>
              )}
              {!step.done && step.hint && <p className="-mt-2 text-sm text-muted">{step.hint}</p>}
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-x-6">
        <Link to="/help" className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 hover:no-underline">
          How OpenDoor works
        </Link>
        <Button variant="link" size="sm" onClick={hide}>
          Hide this
        </Button>
      </div>
    </section>
  )
}
