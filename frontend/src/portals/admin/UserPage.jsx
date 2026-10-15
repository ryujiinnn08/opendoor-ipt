import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getUser, replaceTemporaryPassword, setSuspended } from '../../api/admin.js'
import { fieldErrorsFrom, generalErrorFrom } from '../../api/client.js'
import AccountHistory from '../../components/admin/AccountHistory.jsx'
import PostingStatusBadge from '../../components/postings/PostingStatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import CopyLinkBox from '../../components/ui/CopyLinkBox.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeading from '../../components/ui/PageHeading.jsx'
import ReasonDialog from '../../components/ui/ReasonDialog.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import { ROLE_LABELS, applicationCounts, employerLine } from '../../lib/accountText.js'
import { formatDate } from '../../lib/format.js'

// What suspending leaves alone, per role (plan PHASE_6 Q2).
function keptText(user) {
  if (user.role === 'candidate') return 'Their applications stay as they are.'
  if (user.role === 'admin') return 'Nothing they decided is undone.'
  return user.postings?.length > 0
    ? 'The job postings they manage stay as they are; you can remove any of them from this page.'
    : 'Their company stays as it is.'
}

/**
 * /admin/users/:id: the account, what it's connected to, and its history beside the action
 * (plan PHASE_6 §4.1, §7). Never a job seeker's profile, needs or résumé (Q3). Keyed by the id,
 * so going Back or Forward to another account starts fresh (review WR-07).
 */
export default function UserPage() {
  const { id } = useParams()
  return <UserAccount key={id} id={id} />
}

function UserAccount({ id }) {
  const announce = useAnnounce()
  const [user, setUser] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [message, setMessage] = useState(null)
  const [acting, setActing] = useState(null) // { action: 'suspend' | 'reactivate' | 'password', open, busy, error, done }
  const [newPassword, setNewPassword] = useState(null)
  const messageRef = useRef(null)
  const passwordRef = useRef(null)

  useEffect(() => {
    getUser(id)
      .then(setUser)
      .catch((error) =>
        setLoadError(error?.response?.status === 404 ? "We couldn't find that account." : generalErrorFrom(error)),
      )
  }, [id])

  // A lost temporary password (review WR-05): the new one is shown once, here.
  async function replacePassword() {
    setActing((current) => ({ ...current, busy: true, error: null }))
    try {
      const { user: updated, temporaryPassword } = await replaceTemporaryPassword(user.id)
      setUser(updated)
      setNewPassword(temporaryPassword)
      announce(`${updated.name} has a new temporary password.`)
      setActing((current) => ({ ...current, busy: false, open: false, done: true, focus: passwordRef }))
    } catch (error) {
      setActing((current) => current && { ...current, busy: false, error: generalErrorFrom(error) })
    }
  }

  async function act(reason) {
    const suspending = acting.action === 'suspend'
    setActing((current) => ({ ...current, busy: true, error: null }))
    try {
      const updated = await setSuspended(user.id, suspending, reason)
      setUser(updated)
      const text = suspending ? `${updated.name}'s account is suspended.` : `${updated.name}'s account is active again.`
      setMessage(text)
      announce(text)
      setActing((current) => ({ ...current, busy: false, open: false, done: true }))
    } catch (error) {
      const fieldErrors = fieldErrorsFrom(error)
      setActing((current) => current && { ...current, busy: false, error: Object.values(fieldErrors)[0] ?? generalErrorFrom(error) })
    }
  }

  // The dialog stays open while the change is sent, so a refusal is never lost.
  function closeDialog(open) {
    if (!open) setActing((current) => (current && !current.busy ? { ...current, open: false } : current))
  }

  function afterClose(event) {
    if (!acting?.done) return
    event.preventDefault()
    const target = acting.focus ?? messageRef
    target.current?.focus()
    setActing(null)
  }

  // One <h1> in the same place while loading and after, so the focus RootLayout gives it after
  // navigating isn't lost when the account arrives (A8 keyboard check).
  const header = (action) => (
    <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
      <div className="max-w-prose">
        <PageHeading>{user?.name ?? 'Account'}</PageHeading>
        {user && (
          <p className="mt-2 text-lg">
            {ROLE_LABELS[user.role]}, {user.email}
          </p>
        )}
      </div>
      {action}
    </div>
  )

  if (loadError) {
    return (
      <>
        {header(null)}
        <Notice tone="error" className="mt-6">
          <p>{loadError}</p>
          <Link to="/admin/users" className={TEXT_LINK}>
            Back to users
          </Link>
        </Notice>
      </>
    )
  }

  if (!user) {
    return (
      <>
        {header(null)}
        <LoadingMessage>Loading the account…</LoadingMessage>
      </>
    )
  }

  return (
    <>
      {header(
        !user.is_you &&
          (user.is_active ? (
            <Button variant="secondary" onClick={() => setActing({ action: 'suspend', open: true })}>
              Suspend {user.name}
            </Button>
          ) : (
            <Button onClick={() => setActing({ action: 'reactivate', open: true })}>Reactivate {user.name}</Button>
          )),
      )}

      {message && (
        <div ref={messageRef} tabIndex={-1} className="mt-6 outline-none focus-visible:ring-4 focus-visible:ring-primary">
          <Notice tone="success">{message}</Notice>
        </div>
      )}

      {/* The record sits beside the facts and the action on wide screens (plan PHASE_6 §7). */}
      <div className="mt-6 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div>
          <dl className="max-w-prose">
            <Row label="Status">
              {user.is_active ? (
                `Active since ${formatDate(user.joined_at)}`
              ) : (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusBadge tone="neutral" icon="lock">
                    Suspended
                  </StatusBadge>
                  Can't log in until an administrator reactivates the account.
                </span>
              )}
            </Row>
            {user.role === 'candidate' && <Row label="Applications">{applicationCounts(user.applications)}</Row>}
            {user.role === 'employer' && <Row label="Employer">{employerLine(user.employer)}</Row>}
            <Row label="Last logged in">{user.last_login_at ? formatDate(user.last_login_at) : 'Not since this was recorded'}</Row>
            {user.must_change_password && <Row label="Password">Still the temporary one</Row>}
          </dl>

          {user.role === 'admin' && user.must_change_password && !user.is_you && !newPassword && (
            <p className="mt-4 max-w-prose">
              If {user.name} lost the temporary password, make a new one.{' '}
              <Button variant="link" onClick={() => setActing({ action: 'password', open: true })}>
                Make a new temporary password
              </Button>
            </p>
          )}
          {newPassword && (
            <section
              ref={passwordRef}
              tabIndex={-1}
              aria-labelledby="new-password-heading"
              className="mt-6 rounded-lg border-2 border-success bg-surface p-5 outline-none focus-visible:ring-4 focus-visible:ring-primary"
            >
              <h2 id="new-password-heading" className="text-xl font-bold">
                {user.name}'s new temporary password
              </h2>
              <p className="mt-2 max-w-prose">
                The old one no longer works. Copy this one and give it to them privately; it won't be shown again.
              </p>
              <div className="mt-4">
                <CopyLinkBox id="temporary-password" label="Temporary password" value={newPassword} thing="password" />
              </div>
            </section>
          )}

          {user.is_you && (
            <p className="mt-4 max-w-prose">
              This is your account, so you can't suspend it here.{' '}
              <Link to="/account/password" className="font-bold text-primary underline underline-offset-4 hover:no-underline">
                Change your password
              </Link>
            </p>
          )}

          {user.role === 'employer' && (
            <section aria-labelledby="postings-heading" className="mt-10">
              <h2 id="postings-heading" className="text-2xl font-bold">
                Job postings they manage
              </h2>
              {user.postings.length === 0 ? (
                <p className="mt-2">None sent for approval yet.</p>
              ) : (
                <ul className="mt-3 max-w-3xl">
                  {user.postings.map((posting) => (
                    <li
                      key={posting.id}
                      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-border py-2 first:border-t"
                    >
                      <Link to={`/admin/job-postings/${posting.id}`} className={TEXT_LINK}>
                        {posting.title}
                      </Link>
                      <PostingStatusBadge status={posting.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
        <div>
          <AccountHistory history={user.history} />
        </div>
      </div>

      <p className="mt-12">
        <Link to="/admin/users" className={TEXT_LINK}>
          Back to users
        </Link>
      </p>

      <ReasonDialog
        open={Boolean(acting?.open && acting.action === 'suspend')}
        onOpenChange={closeDialog}
        title={`Suspend ${user.name}?`}
        description={`They can't log in until you reactivate the account, and they're logged out now. ${keptText(user)}`}
        label="Why (only administrators see this)"
        hint="It stays in the account's history, e.g., Posted fake jobs, reported by 3 job seekers."
        confirmLabel={`Suspend ${user.name}`}
        confirmVariant="primary"
        minLength={5}
        onConfirm={act}
        busy={acting?.busy}
        error={acting?.error}
        onCloseAutoFocus={afterClose}
      />
      <ConfirmDialog
        open={Boolean(acting?.open && acting.action === 'password')}
        onOpenChange={closeDialog}
        title={`Make a new temporary password for ${user.name}?`}
        description="The one you gave them stops working now. You'll see the new one once, on this page."
        confirmLabel="Make a new password"
        confirmVariant="primary"
        onConfirm={replacePassword}
        busy={acting?.busy}
        error={acting?.error}
        onCloseAutoFocus={afterClose}
      />
      <ConfirmDialog
        open={Boolean(acting?.open && acting.action === 'reactivate')}
        onOpenChange={closeDialog}
        title={`Reactivate ${user.name}?`}
        description="They can log in again straight away. This is recorded in the account's history."
        confirmLabel={`Reactivate ${user.name}`}
        confirmVariant="primary"
        onConfirm={() => act()}
        busy={acting?.busy}
        error={acting?.error}
        onCloseAutoFocus={afterClose}
      />
    </>
  )
}

function Row({ label, children }) {
  return (
    <div className="grid gap-x-6 border-b border-border py-3 first:border-t sm:grid-cols-[10rem_1fr]">
      <dt className="font-bold">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
