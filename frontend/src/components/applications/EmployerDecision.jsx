import { useRef, useState } from 'react'
import { changeApplicationStatus } from '../../api/applications.js'
import { generalErrorFrom } from '../../api/client.js'
import { formatDay } from '../../lib/format.js'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { useAnnounce } from '../ui/announcerContext.js'

const DECISIONS = {
  hire: {
    status: 'hired',
    button: 'Mark as hired',
    variant: 'primary',
    description: (name, title) => `Mark ${name} as hired for ${title}? You can't undo this.`,
    confirm: 'Yes, mark as hired',
    confirmVariant: 'primary',
    done: 'Marked as hired.',
  },
  reject: {
    status: 'rejected',
    button: 'Mark as rejected',
    variant: 'secondary',
    description: (name, title) => `Mark ${name} as rejected for ${title}? You can't undo this. They'll see 'Rejected' on their applications.`,
    confirm: 'Yes, mark as rejected',
    confirmVariant: 'danger',
    done: 'Marked as rejected.',
  },
}

/** What was decided, said instead of the buttons. */
function decidedText(applicant) {
  if (applicant.status === 'hired') {
    return applicant.hire_confirmed_by === 'candidate'
      ? `Hired on ${formatDay(applicant.hired_at)}. Confirmed by the applicant.`
      : `You marked them as hired on ${formatDay(applicant.hired_at)}.`
  }
  if (applicant.status === 'rejected') return 'You marked them as rejected.'
  return null
}

/**
 * The employer's decision on an applicant (F6.6): Mark as hired or Mark as rejected, each
 * confirmed first, only when the server lists it in `actions`. A 409 means the job seeker changed
 * it meanwhile: the dialog says so, and once it's closed `onStale` reloads (a withdrawal replaces
 * this panel, so reloading earlier would sweep the message away). `onChanged` also runs once the
 * dialog has closed; then `focusAfter`.
 */
export default function EmployerDecision({ applicant, onChanged, onStale, focusAfter }) {
  const announce = useAnnounce()
  const [pending, setPending] = useState(null) // { key, open, busy, error, done, stale }
  const updatedRef = useRef(null)
  const keys = Object.keys(DECISIONS).filter((key) => applicant.actions.includes(key))
  const decision = pending ? DECISIONS[pending.key] : null
  const name = applicant.applicant.name
  const title = applicant.job?.title ?? ''

  async function confirm() {
    setPending((current) => ({ ...current, busy: true, error: null }))
    try {
      updatedRef.current = await changeApplicationStatus(applicant.id, { status: decision.status, expected_status: applicant.status })
      announce(decision.done)
      setPending((current) => current && { ...current, open: false, busy: false, done: true })
    } catch (error) {
      const stale = error?.response?.status === 409
      setPending((current) => current && { ...current, busy: false, stale, error: generalErrorFrom(error) ?? 'Something went wrong. Please try again.' })
    }
  }

  function closeDialog(open) {
    if (!open) setPending((current) => (current && !current.busy ? { ...current, open: false } : current))
  }

  function afterClose(event) {
    if (pending?.done || pending?.stale) {
      if (focusAfter) event.preventDefault()
      if (pending.done) onChanged(updatedRef.current)
      else onStale?.()
      focusAfter?.()
    }
    setPending(null)
  }

  return (
    <section aria-labelledby="decision-heading">
      <h2 id="decision-heading" className="text-2xl font-bold">
        Your decision
      </h2>
      {keys.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {keys.map((key) => (
            <Button key={key} variant={DECISIONS[key].variant} onClick={() => setPending({ key, open: true, busy: false, error: null, done: false })}>
              {DECISIONS[key].button}
            </Button>
          ))}
        </div>
      ) : (
        <p className="mt-2">{decidedText(applicant)}</p>
      )}
      {decision && (
        <ConfirmDialog
          open={pending.open}
          onOpenChange={closeDialog}
          title={decision.button}
          description={decision.description(name, title)}
          confirmLabel={decision.confirm}
          confirmVariant={decision.confirmVariant}
          onConfirm={confirm}
          busy={pending.busy}
          error={pending.error}
          onCloseAutoFocus={afterClose}
        />
      )}
    </section>
  )
}
