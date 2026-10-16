import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { decidePosting, getPostingForReview, removePosting } from '../../api/admin.js'
import { fieldErrorsFrom, generalErrorFrom } from '../../api/client.js'
import JobDetails from '../../components/postings/JobDetails.jsx'
import PostingStatusBadge from '../../components/postings/PostingStatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import ReasonDialog from '../../components/ui/ReasonDialog.jsx'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { formatDate, formatDay } from '../../lib/format.js'
import { manilaToday } from '../../lib/postingOptions.js'

/**
 * One posting for the admin to approve or reject (plan PHASE_2 decision 33), or remove with a
 * reason the employer sees (plan PHASE_6 §4.2). Drafts can't be opened here; the API answers 404.
 * Keyed by the id, so going Back or Forward to another posting starts fresh (review WR-07).
 */
export default function PostingReviewPage() {
  const { id } = useParams()
  return <PostingReview key={id} id={id} />
}

function PostingReview({ id }) {
  const navigate = useNavigate()
  const announce = useAnnounce()
  const [posting, setPosting] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [deciding, setDeciding] = useState(null) // { decision: 'approve' | 'reject' | 'remove', open, busy, error, done }
  const [removedMessage, setRemovedMessage] = useState(null)
  const removedRef = useRef(null)

  useEffect(() => {
    getPostingForReview(id)
      .then(setPosting)
      .catch((error) =>
        setLoadError(
          error?.response?.status === 404 ? "This posting doesn't exist, was deleted, or is still a draft." : generalErrorFrom(error),
        ),
      )
  }, [id])

  async function remove(reason) {
    setDeciding((current) => ({ ...current, busy: true, error: null }))
    try {
      await removePosting(posting.id, reason)
      // It's removed even if reloading it fails: show it removed rather than an error to retry,
      // which would answer 404 (review WR-03).
      const reloaded = await getPostingForReview(posting.id).catch(() => null)
      setPosting(reloaded ?? { ...posting, removal: { removed_at: new Date().toISOString(), reason } })
      const text = `"${posting.title}" was removed. The employer can see your reason.`
      setRemovedMessage(text)
      announce(text)
      setDeciding((current) => ({ ...current, busy: false, open: false, done: true }))
    } catch (error) {
      const fieldErrors = fieldErrorsFrom(error)
      setDeciding(
        (current) => current && { ...current, busy: false, error: Object.values(fieldErrors)[0] ?? generalErrorFrom(error) },
      )
    }
  }

  function afterRemoveClose(event) {
    if (!deciding?.done) return
    event.preventDefault()
    removedRef.current?.focus()
    setDeciding(null)
  }

  async function decide(reason) {
    setDeciding((current) => ({ ...current, busy: true, error: null }))
    try {
      const decided = await decidePosting(posting.id, deciding.decision, reason, posting.updated_at)
      let message = `"${posting.title}" was rejected. The employer can see your reason.`
      if (deciding.decision === 'approve') {
        message =
          decided.status === 'closed'
            ? `"${posting.title}" is approved. It shows as Closed until the employer chooses a new closing date.`
            : `"${posting.title}" is approved and open to job seekers.`
      }
      navigate('/admin/job-postings', { state: { message } })
    } catch (error) {
      const fieldErrors = fieldErrorsFrom(error)
      setDeciding(
        (current) => current && { ...current, busy: false, error: Object.values(fieldErrors)[0] ?? generalErrorFrom(error) },
      )
    }
  }

  // The dialog stays open while the decision is sent, so a refusal is never lost.
  function closeDialog(open) {
    if (!open) setDeciding((current) => (current && !current.busy ? { ...current, open: false } : current))
  }

  if (loadError) {
    return (
      <>
        <PageHeader back={{ to: '/admin/job-postings', label: 'Back to posting approvals' }} title="Review posting" />
        <Notice tone="error" className="mt-6">
          <p>{loadError}</p>
          <Link to="/admin/job-postings" className={TEXT_LINK}>
            Back to posting approvals
          </Link>
        </Notice>
      </>
    )
  }

  if (!posting) {
    return (
      <>
        <PageHeader back={{ to: '/admin/job-postings', label: 'Back to posting approvals' }} title="Review posting" />
        <LoadingMessage>Loading the posting…</LoadingMessage>
      </>
    )
  }

  const removal = posting.removal
  const waiting = posting.status === 'pending' && !removal
  const datePassed = Boolean(posting.closes_on) && posting.closes_on < manilaToday()

  return (
    <>
      <PageHeader back={{ to: '/admin/job-postings', label: 'Back to posting approvals' }}
        title={posting.title}
        documentTitle={`Review: ${posting.title}`}
        intro={
          removal
            ? "Job seekers can't see this posting. Its applicants keep their applications."
            : waiting
              ? 'Job seekers see this posting once you approve it.'
              : undefined
        }
      />
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <PostingStatusBadge status={removal ? 'removed' : posting.status} />
        {posting.submitted_at && <span className="text-muted">Submitted {formatDate(posting.submitted_at)}</span>}
      </div>

      {removedMessage && (
        <div ref={removedRef} tabIndex={-1} className="mt-6 outline-none focus-visible:ring-4 focus-visible:ring-primary">
          <Notice tone="success">{removedMessage}</Notice>
        </div>
      )}
      {removal && (
        <p className="mt-6 max-w-prose border-l-4 border-text pl-5">
          Removed by OpenDoor on {formatDate(removal.removed_at)}
          {removal.removed_by ? ` (${removal.removed_by})` : ''}: {removal.reason}
        </p>
      )}

      {!removal && posting.changed_after_approval && (
        <Notice className="mt-6">This posting was approved before and has since been changed. Read it all again before you decide.</Notice>
      )}
      {waiting && datePassed && (
        <Notice className="mt-6">
          The closing date has passed. If you approve it, it shows as Closed until the employer reopens it with a new date.
        </Notice>
      )}
      {posting.status === 'rejected' && posting.rejection_reason && (
        <Notice tone="error" className="mt-6">
          <span className="font-bold">You rejected this posting.</span> Reason: {posting.rejection_reason}
        </Notice>
      )}

      <JobDetails posting={posting} showVerificationStatus markRetired />

      {waiting && (
        <section aria-labelledby="decision-heading" className="mt-12 border-t border-border pt-8">
          <h2 id="decision-heading" className="text-2xl font-bold">
            Your decision
          </h2>
          <p className="mt-2 max-w-prose">
            Approve it if it describes a real job and lists accommodations the employer can provide. If something needs
            fixing, reject it and say what.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => setDeciding({ decision: 'approve', open: true })}>Approve</Button>
            <Button variant="secondary" onClick={() => setDeciding({ decision: 'reject', open: true })}>
              Reject
            </Button>
          </div>
        </section>
      )}

      {!removal && (
        <section aria-labelledby="remove-heading" className="mt-12 border-t border-border pt-8">
          <h2 id="remove-heading" className="text-2xl font-bold">
            Remove this posting
          </h2>
          <p className="mt-2 max-w-prose">
            Remove it if it's misleading, for example if the accommodations it lists aren't really provided. Applicants keep
            their applications, and the employer can still decide on them.
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => setDeciding({ decision: 'remove', open: true })}>
            Remove {posting.title}
          </Button>
        </section>
      )}


      <ReasonDialog
        open={Boolean(deciding?.open && deciding.decision === 'remove')}
        onOpenChange={closeDialog}
        title={`Remove ${posting.title}?`}
        description="Job seekers won't see it again, and the employer can't edit or reopen it. You can't undo this."
        label="Reason (the employer sees this)"
        hint="Say what was wrong, e.g., Accommodations listed aren't available at this site."
        confirmLabel={`Remove ${posting.title}`}
        minLength={5}
        onConfirm={remove}
        busy={deciding?.busy}
        error={deciding?.error}
        onCloseAutoFocus={afterRemoveClose}
      />

      <ConfirmDialog
        open={Boolean(deciding?.open && deciding.decision === 'approve')}
        onOpenChange={closeDialog}
        title={`Approve "${posting.title}"?`}
        description={
          posting.closes_on && !datePassed
            ? `Job seekers can see it until ${formatDay(posting.closes_on)}.`
            : 'It will show as Closed until the employer chooses a new closing date.'
        }
        confirmLabel="Approve posting"
        confirmVariant="primary"
        onConfirm={() => decide()}
        busy={deciding?.busy}
        error={deciding?.error}
      />
      <ReasonDialog
        open={Boolean(deciding?.open && deciding.decision === 'reject')}
        onOpenChange={closeDialog}
        title={`Reject "${posting.title}"?`}
        description="The employer will see your reason."
        hint="Say what to fix, e.g., the description doesn't say what the job involves."
        confirmLabel="Reject posting"
        onConfirm={decide}
        busy={deciding?.busy}
        error={deciding?.error}
      />
    </>
  )
}
