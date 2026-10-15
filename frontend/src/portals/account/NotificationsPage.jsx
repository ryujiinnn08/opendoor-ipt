import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { generalErrorFrom } from '../../api/client.js'
import { getNotifications, markAllRead, markRead } from '../../api/notifications.js'
import { useAuth } from '../../auth/authContext.js'
import Button from '../../components/ui/Button.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import { formatDate } from '../../lib/format.js'
import { EMPTY_NOTIFICATIONS, notificationText } from '../../lib/notificationText.js'

/**
 * /notifications for job seekers and employers (plan PHASE_6 §4.4, F9.1, F9.2): newest first,
 * 20 a page, each a sentence linking to what changed. Unread ones are bold and say "New" in
 * words; opening one marks it read.
 */
export default function NotificationsPage() {
  const { role } = useAuth()
  const announce = useAnnounce()
  const outlet = useOutletContext()
  const [searchParams] = useSearchParams()
  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1)
  const [result, setResult] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [marking, setMarking] = useState(false)
  const listHeading = useRef(null)

  const load = useCallback(() => {
    getNotifications(page)
      .then((data) => {
        setResult(data)
        setLoadError(null)
      })
      .catch((error) => setLoadError(generalErrorFrom(error)))
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  async function readAll() {
    setMarking(true)
    try {
      await markAllRead()
      const now = new Date().toISOString()
      setResult((current) => ({ ...current, data: current.data.map((item) => ({ ...item, read_at: item.read_at ?? now })) }))
      outlet?.refreshNotifications()
      announce('All notifications are marked as read.')
      listHeading.current?.focus()
    } catch (error) {
      setLoadError(generalErrorFrom(error))
    } finally {
      setMarking(false)
    }
  }

  // Marked read on the way to its page, then the header's count follows; a failure only
  // leaves it unread.
  function open(item) {
    if (item.read_at) return
    markRead(item.id)
      .then(() => outlet?.refreshNotifications())
      .catch(() => {})
  }

  const unread = result?.data.some((item) => !item.read_at)

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        intro="What changed, newest first. Notifications are kept for 90 days."
        actions={
          unread && (
            <Button variant="secondary" onClick={readAll} loading={marking} loadingText="Marking…">
              Mark all as read
            </Button>
          )
        }
      />

      <h2 ref={listHeading} tabIndex={-1} className="sr-only">
        Your notifications
      </h2>

      {loadError && (
        <Notice tone="error" className="mt-6">
          <p>{loadError}</p>
          <Button variant="link" onClick={load}>
            Try again
          </Button>
        </Notice>
      )}
      {!result && !loadError && <LoadingMessage>Loading notifications…</LoadingMessage>}
      {result?.data.length === 0 && <p className="mt-8 max-w-prose">{EMPTY_NOTIFICATIONS[role]}</p>}

      {result?.data.length > 0 && (
        <ul className="mt-8">
          {result.data.map((item) => {
            const { text, to } = notificationText(item, role)
            const isNew = !item.read_at
            return (
              <li key={item.id} className="border-b border-border py-4 first:border-t">
                <p className={isNew ? 'font-bold' : ''}>
                  {isNew && <span className="mr-2 rounded-full bg-primary-soft px-2 py-0.5 text-sm text-primary">New</span>}
                  <Link
                    to={to}
                    onClick={() => open(item)}
                    className="text-primary underline underline-offset-4 hover:no-underline"
                  >
                    {text}
                  </Link>
                </p>
                <p className="mt-1 text-sm text-muted">{formatDate(item.created_at)}</p>
              </li>
            )
          })}
        </ul>
      )}

      {result && (
        <Pagination
          page={result.meta.current_page}
          lastPage={result.meta.last_page}
          hrefForPage={(next) => (next > 1 ? `/notifications?page=${next}` : '/notifications')}
          label="Pages of notifications"
        />
      )}
    </div>
  )
}
