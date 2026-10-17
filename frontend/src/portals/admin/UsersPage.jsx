import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getUsers, setSuspended } from '../../api/admin.js'
import { fieldErrorsFrom, generalErrorFrom } from '../../api/client.js'
import { useAuth } from '../../auth/authContext.js'
import EditUserDialog from '../../components/admin/EditUserDialog.jsx'
import RoleBadge from '../../components/admin/RoleBadge.jsx'
import UserActionsMenu from '../../components/admin/UserActionsMenu.jsx'
import UserAvatar from '../../components/admin/UserAvatar.jsx'
import Button from '../../components/ui/Button.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import FormField from '../../components/ui/FormField.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import { backState } from '../../lib/backState.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import ReasonDialog from '../../components/ui/ReasonDialog.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import SelectField from '../../components/ui/SelectField.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { PRIMARY_LINK, TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import { ROLE_FILTERS, STATUS_FILTERS, accountLine, keptText } from '../../lib/accountText.js'
import { formatDate } from '../../lib/format.js'

const known = (options, value) => (options.some((option) => option.value === value) ? value : '')

/**
 * /admin/users: every account, searchable by name or email, filtered by role and status, 20 a
 * page (plan PHASE_6 §4.1, F10.1). The search and filters live in the address, so a result can
 * be shared, reloaded and gone back to. Each row shows the picture, role, card basics and dates,
 * with an Actions menu to edit, suspend or reactivate in place (ADMIN_USERS_PLAN).
 */
export default function UsersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const role = known(ROLE_FILTERS, searchParams.get('role'))
  const status = known(STATUS_FILTERS, searchParams.get('status'))
  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1)

  const [result, setResult] = useState(null) // { data, meta }
  const [loadError, setLoadError] = useState(null)
  const resultsHeading = useRef(null)
  const searched = useRef(false)
  const latest = useRef(0)
  const { user: me } = useAuth()
  const announce = useAnnounce()
  const [message, setMessage] = useState(null)
  const [acting, setActing] = useState(null) // { user, action: 'edit' | 'suspend' | 'reactivate', open, busy, error, done }
  const messageRef = useRef(null)

  // Only the latest search's answer is shown (review WR-08); focus moves only after a search.
  const load = useCallback(() => {
    const request = ++latest.current
    getUsers({ q: q || undefined, role: role || undefined, status: status || undefined, page })
      .then((data) => {
        if (request !== latest.current) return
        setResult(data)
        setLoadError(null)
        if (searched.current) resultsHeading.current?.focus()
        searched.current = false
      })
      .catch((error) => {
        if (request !== latest.current) return
        setLoadError(generalErrorFrom(error))
        searched.current = false
      })
  }, [q, role, status, page])

  useEffect(() => {
    load()
  }, [load])

  function addressFor(values, nextPage = 1) {
    const params = new URLSearchParams()
    if (values.q.trim()) params.set('q', values.q.trim())
    if (values.role) params.set('role', values.role)
    if (values.status) params.set('status', values.status)
    if (nextPage > 1) params.set('page', String(nextPage))
    const query = params.toString()
    return query ? `${location.pathname}?${query}` : location.pathname
  }

  function search(values) {
    searched.current = true
    navigate(addressFor(values))
  }

  // Put the changed account in its row and say what happened, where focus lands after the dialog.
  function done(updated, text) {
    setResult((current) => current && { ...current, data: current.data.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)) })
    setMessage(text)
    announce(text)
    setActing((current) => current && { ...current, busy: false, open: false, done: true })
  }

  async function changeStatus(reason) {
    const suspending = acting.action === 'suspend'
    setActing((current) => ({ ...current, busy: true, error: null }))
    try {
      const updated = await setSuspended(acting.user.id, suspending, reason)
      done(updated, suspending ? `${updated.name}'s account is suspended.` : `${updated.name}'s account is active again.`)
    } catch (error) {
      const fieldErrors = fieldErrorsFrom(error)
      setActing((current) => current && { ...current, busy: false, error: Object.values(fieldErrors)[0] ?? generalErrorFrom(error) })
    }
  }

  // The dialog stays open while a change is sent, so a refusal is never lost.
  function closeDialog(open) {
    if (!open) setActing((current) => (current && !current.busy ? { ...current, open: false } : current))
  }

  function afterClose(event) {
    if (!acting?.done) return
    event.preventDefault()
    messageRef.current?.focus()
    setActing(null)
  }

  const filtered = Boolean(q || role || status)
  const total = result?.meta.total ?? 0
  const heading = !result ? 'Accounts' : `${total === 1 ? '1 account' : `${total} accounts`}${filtered ? ' found' : ''}`

  return (
    <>
      <PageHeader
        title="Users"
        intro="Every OpenDoor account. Open one to see its history, or use Actions to edit, suspend or reactivate it."
        actions={
          <Link to="/admin/users/new" className={PRIMARY_LINK}>
            Add an administrator
          </Link>
        }
      />

      {/* Keyed by the address, so the fields follow it (e.g., after Back). */}
      <SearchForm key={`${q}|${role}|${status}`} initial={{ q, role, status }} onSearch={search} />

      <h2 ref={resultsHeading} tabIndex={-1} className="mt-8 text-2xl font-bold outline-none">
        {heading}
      </h2>

      {loadError && (
        <Notice tone="error" className="mt-4">
          <p>{loadError}</p>
          <Button
            variant="link"
            onClick={() => {
              setLoadError(null)
              load()
            }}
          >
            Try again
          </Button>
        </Notice>
      )}
      {!result && !loadError && <LoadingMessage>Loading accounts…</LoadingMessage>}

      {result?.data.length === 0 && (
        <div className="mt-4 max-w-prose">
          <p>No accounts match. Check the spelling, or search with fewer filters.</p>
          {filtered && (
            <p className="mt-2">
              <Link to={location.pathname} className={TEXT_LINK}>
                Show every account
              </Link>
            </p>
          )}
        </div>
      )}

      {message && (
        <div ref={messageRef} tabIndex={-1} className="mt-4 outline-none focus-visible:ring-4 focus-visible:ring-primary">
          <Notice tone="success">{message}</Notice>
        </div>
      )}

      {result?.data.length > 0 && (
        <ul className="mt-4">
          {result.data.map((user) => (
            <li
              key={user.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-border py-5 first:border-t sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <UserAvatar user={user} />
              <div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-xl font-bold">
                    <Link to={`/admin/users/${user.id}`} state={backState(location)} className={TEXT_LINK}>
                      {user.name}
                    </Link>
                  </h3>
                  <RoleBadge role={user.role} />
                  {!user.is_active && (
                    <StatusBadge tone="neutral" icon="lock">
                      Suspended
                    </StatusBadge>
                  )}
                </div>
                <p className="break-all">{user.email}</p>
                {accountLine(user) && <p className="mt-1">{accountLine(user)}</p>}
                <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
                  <li>Joined {formatDate(user.joined_at)}</li>
                  <li>{user.last_login_at ? `Last logged in ${formatDate(user.last_login_at)}` : 'Not logged in since this was recorded'}</li>
                </ul>
              </div>
              <div className="col-start-2 sm:col-start-3 sm:row-start-1">
                <UserActionsMenu
                  user={user}
                  own={me?.id != null && me.id === user.id}
                  viewTo={`/admin/users/${user.id}`}
                  viewState={backState(location)}
                  onAction={(action) => {
                    setMessage(null)
                    setActing({ user, action, open: true })
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {acting && (
        <>
          <EditUserDialog
            user={acting.user}
            open={Boolean(acting.open && acting.action === 'edit')}
            onOpenChange={closeDialog}
            onSaved={(updated) => done(updated, `${updated.name}'s details are saved.`)}
            onCloseAutoFocus={afterClose}
          />
          <ReasonDialog
            open={Boolean(acting.open && acting.action === 'suspend')}
            onOpenChange={closeDialog}
            title={`Suspend ${acting.user.name}?`}
            description={`They can't log in until you reactivate the account, and they're logged out now. ${keptText(acting.user)}`}
            label="Why (only administrators see this)"
            hint="It stays in the account's history, e.g., Posted jobs with false company details."
            confirmLabel={`Suspend ${acting.user.name}`}
            confirmVariant="primary"
            minLength={5}
            onConfirm={changeStatus}
            busy={acting.busy}
            error={acting.error}
            onCloseAutoFocus={afterClose}
          />
          <ConfirmDialog
            open={Boolean(acting.open && acting.action === 'reactivate')}
            onOpenChange={closeDialog}
            title={`Reactivate ${acting.user.name}?`}
            description="They can log in again straight away. This is recorded in the account's history."
            confirmLabel={`Reactivate ${acting.user.name}`}
            confirmVariant="primary"
            onConfirm={() => changeStatus()}
            busy={acting.busy}
            error={acting.error}
            onCloseAutoFocus={afterClose}
          />
        </>
      )}

      {result && (
        <Pagination
          page={result.meta.current_page}
          lastPage={result.meta.last_page}
          hrefForPage={(next) => addressFor({ q, role, status }, next)}
          label="Pages of accounts"
        />
      )}
    </>
  )
}

function SearchForm({ initial, onSearch }) {
  const [form, setForm] = useState(initial)

  function handleSubmit(event) {
    event.preventDefault()
    onSearch(form)
  }

  return (
    <form role="search" aria-label="Find accounts" onSubmit={handleSubmit} noValidate className="mt-8 border-y border-border py-6">
      <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-start">
        <FormField
          id="user-search"
          label="Name or email"
          type="text"
          enterKeyHint="search"
          spellCheck={false}
          value={form.q}
          onChange={(event) => setForm((current) => ({ ...current, q: event.target.value }))}
          maxLength={100}
          inputClassName="w-full"
          className="sm:col-span-2 lg:col-span-1 lg:mb-0"
        />
        <SelectField
          id="user-role"
          label="Role"
          options={ROLE_FILTERS}
          value={form.role}
          onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
          className="lg:mb-0"
        />
        <SelectField
          id="user-status"
          label="Status"
          options={STATUS_FILTERS}
          value={form.status}
          onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
          className="lg:mb-0"
        />
        {/* Level with the fields under their labels. */}
        <div className="lg:mt-9">
          <Button type="submit">Search</Button>
        </div>
      </div>
    </form>
  )
}
