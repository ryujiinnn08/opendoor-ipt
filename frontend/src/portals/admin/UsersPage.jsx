import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getUsers } from '../../api/admin.js'
import { generalErrorFrom } from '../../api/client.js'
import Button from '../../components/ui/Button.jsx'
import FormField from '../../components/ui/FormField.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import { backState } from '../../lib/backState.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import SelectField from '../../components/ui/SelectField.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { PRIMARY_LINK, TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { ROLE_FILTERS, ROLE_LABELS, STATUS_FILTERS, employerLine } from '../../lib/accountText.js'
import { formatDate } from '../../lib/format.js'

const known = (options, value) => (options.some((option) => option.value === value) ? value : '')

/**
 * /admin/users: every account, searchable by name or email, filtered by role and status, 20 a
 * page (plan PHASE_6 §4.1, F10.1). The search and filters live in the address, so a result can
 * be shared, reloaded and gone back to.
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

  const filtered = Boolean(q || role || status)
  const total = result?.meta.total ?? 0
  const heading = !result ? 'Accounts' : `${total === 1 ? '1 account' : `${total} accounts`}${filtered ? ' found' : ''}`

  return (
    <>
      <PageHeader
        title="Users"
        intro="Every OpenDoor account. Open one to see its history, or to suspend or reactivate it."
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

      {result?.data.length > 0 && (
        <ul className="mt-4">
          {result.data.map((user) => (
            <li key={user.id} className="border-b border-border py-5 first:border-t">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <h3 className="text-xl font-bold">
                  <Link to={`/admin/users/${user.id}`} state={backState(location)} className={TEXT_LINK}>
                    {user.name}
                  </Link>
                </h3>
                {!user.is_active && (
                  <StatusBadge tone="neutral" icon="lock">
                    Suspended
                  </StatusBadge>
                )}
              </div>
              <p className="mt-1">
                {ROLE_LABELS[user.role]}, {user.email}
              </p>
              <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-muted">
                {user.role === 'employer' && <li>{employerLine(user.employer)}</li>}
                <li>Joined {formatDate(user.joined_at)}</li>
              </ul>
            </li>
          ))}
        </ul>
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
