import { nextStepText } from '../../lib/applicationText.js'
import { formatDate, formatDay } from '../../lib/format.js'
import Icon from '../ui/Icon.jsx'

const STATE_TEXT = { done: 'Done', current: 'Current step', ahead: 'Not yet' }

/** The steps of this application: Sent, Opened by the employer, then the decision or Withdrawn. */
function stepsFor(application) {
  const { status } = application
  const sentence = nextStepText(application)
  const steps = [{ key: 'sent', label: 'Sent', date: formatDate(application.applied_at), state: status === 'pending' ? 'current' : 'done' }]

  if (status === 'withdrawn') {
    // Withdrawn replaces the steps it never reached.
    if (application.reviewed_at) steps.push({ key: 'opened', label: 'Opened by the employer', date: formatDate(application.reviewed_at), state: 'done' })
    steps.push({ key: 'withdrawn', label: 'Withdrawn', date: formatDate(application.withdrawn_at), state: 'current' })
  } else {
    steps.push({
      key: 'opened',
      label: 'Opened by the employer',
      date: formatDate(application.reviewed_at),
      state: status === 'pending' ? 'ahead' : status === 'reviewed' ? 'current' : 'done',
    })
    if (status === 'hired') steps.push({ key: 'decision', label: 'Hired', date: formatDay(application.hired_at), state: 'current' })
    else if (status === 'rejected') steps.push({ key: 'decision', label: 'Rejected', date: formatDate(application.rejected_at), state: 'current' })
    else steps.push({ key: 'decision', label: 'Decision', date: '', state: 'ahead' })
  }

  return steps.map((step) => ({ ...step, sentence: step.state === 'current' ? sentence : null }))
}

/**
 * The application's path (plan PHASE_4 §7, the one bold element): an ordered list joined by an
 * ink line. Passed steps have a filled ink marker and their date; the current step is bold with
 * the next-step sentence; steps ahead have the muted open circle. Each step says its state in text.
 */
export default function ApplicationPath({ application, headingId }) {
  const steps = stepsFor(application)

  return (
    <ol aria-label={headingId ? undefined : 'Your application'} aria-labelledby={headingId} className="mt-4">
      {steps.map((step, index) => {
        const last = index === steps.length - 1
        return (
          <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute top-8 bottom-0 left-[0.9375rem] w-0.5 ${step.state === 'done' ? 'bg-text' : 'bg-border'}`}
              />
            )}
            <span className="relative flex size-8 shrink-0 items-center justify-center bg-bg">
              {step.state === 'ahead' && (
                <span className="text-muted">
                  <Icon name="circle" className="size-7" />
                </span>
              )}
              {step.state === 'done' && (
                <span className="flex size-8 items-center justify-center rounded-full bg-text text-surface">
                  <Icon name="check" className="size-5" />
                </span>
              )}
              {/* The current step: a thick ink ring around an ink dot, a different shape from a done step's check. */}
              {step.state === 'current' && (
                <span data-step-marker="current" className="flex size-8 items-center justify-center rounded-full border-4 border-text bg-surface">
                  <span className="size-3 rounded-full bg-text" />
                </span>
              )}
            </span>
            <span className="min-w-0 pt-0.5">
              <span className={`block text-lg ${step.state === 'current' ? 'font-bold' : ''} ${step.state === 'ahead' ? 'text-muted' : ''}`}>
                {step.label}
                <span className="sr-only">{`, ${STATE_TEXT[step.state]}`}</span>
              </span>
              <span className={`block ${step.state === 'ahead' ? 'text-muted' : ''}`}>{step.state === 'ahead' ? 'Not yet' : step.date}</span>
              {step.sentence && <span className="mt-1 block max-w-prose">{step.sentence}</span>}
              {step.key === 'decision' && application.status === 'hired' && application.hire_confirmed_by === 'candidate' && (
                <span className="mt-1 block text-muted">Confirmed by you</span>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
