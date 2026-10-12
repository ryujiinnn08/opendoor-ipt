import { useRef, useState } from 'react'
import { changeApplicationStatus } from '../../api/applications.js'
import { generalErrorFrom } from '../../api/client.js'
import { ASK_EMPLOYER_FIRST } from '../../lib/applicationText.js'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { useAnnounce } from '../ui/announcerContext.js'

const ACTIONS = {
  withdraw: {
    status: 'withdrawn',
    button: 'Withdraw application',
    title: 'Withdraw application',
    description: ({ job }) => `Withdraw your application for ${job.title}? You can't undo this or apply for this job again.`,
    confirm: 'Withdraw application',
    variant: 'danger',
    done: 'Application withdrawn.',
  },
  confirm_hire: {
    status: 'hired',
    button: 'I was hired',
    title: 'I was hired',
    description: ({ job }) => `Confirm that ${job.employer.name} hired you for ${job.title}?`,
    confirm: 'Yes, I was hired',
    variant: 'primary',
    done: 'Marked as hired.',
  },
}

/**
 * The job seeker's actions on one application (F6.4, F6.7): only the ones the server lists in
 * `actions`, each confirmed first. `expected_status` is the status shown, so a change made
 * meanwhile is refused and explained. After a change, `focusAfter` puts focus somewhere that
 * still exists (the button that opened the dialog is usually gone). `onChanged` runs once the dialog
 * has closed (outside its focus trap; it may return a promise, e.g. a reload), then `focusAfter`. A 409 means the application changed elsewhere:
 * `onStale` reloads it while the dialog explains. `explainHire` adds, on a
 * Pending application, why I was hired isn't offered yet (the application page; lists leave it
 * out so it doesn't repeat on every row).
 */
export default function ApplicationActions({ application, onChanged, onStale, focusAfter, explainHire = false }) {
  const announce = useAnnounce()
  const updatedRef = useRef(null)
  const [pending, setPending] = useState(null) // { key, open, busy, error, done }
  const keys = Object.keys(ACTIONS).filter((key) => application.actions.includes(key))
  const action = pending ? ACTIONS[pending.key] : null

  async function confirm() {
    setPending((current) => ({ ...current, busy: true, error: null }))
    try {
      const updated = await changeApplicationStatus(application.id, { status: action.status, expected_status: application.status })
      announce(action.done)
      updatedRef.current = updated
      setPending((current) => current && { ...current, open: false, busy: false, done: true })
    } catch (error) {
      setPending((current) => current && { ...current, busy: false, error: generalErrorFrom(error) ?? 'Something went wrong. Please try again.' })
      if (error?.response?.status === 409) onStale?.()
    }
  }

  function closeDialog(open) {
    if (!open) setPending((current) => (current && !current.busy ? { ...current, open: false } : current))
  }

  function afterClose(event) {
    if (pending?.done) {
      const updated = updatedRef.current
      if (focusAfter) event.preventDefault()
      Promise.resolve(onChanged(updated)).then(
        () => focusAfter?.(updated.id),
        () => focusAfter?.(updated.id),
      )
    }
    setPending(null)
  }

  return (
    <>
      {explainHire && application.status === 'pending' && <p className="mt-3 max-w-prose text-muted">{ASK_EMPLOYER_FIRST}</p>}
      {keys.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {keys.map((key) => (
            <Button
              key={key}
              variant="secondary"
              aria-label={`${ACTIONS[key].button} for ${application.job.title}`}
              onClick={() => setPending({ key, open: true, busy: false, error: null, done: false })}
            >
              {ACTIONS[key].button}
            </Button>
          ))}
        </div>
      )}
      {action && (
        <ConfirmDialog
          open={pending.open}
          onOpenChange={closeDialog}
          title={action.title}
          description={action.description(application)}
          confirmLabel={action.confirm}
          confirmVariant={action.variant}
          onConfirm={confirm}
          busy={pending.busy}
          error={pending.error}
          onCloseAutoFocus={afterClose}
        />
      )}
    </>
  )
}
