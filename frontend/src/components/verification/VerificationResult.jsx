import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/authContext.js'
import Button from '../ui/Button.jsx'
import Notice from '../ui/Notice.jsx'
import { TEXT_LINK } from '../ui/buttonLinkStyles.js'
import { useAnnounce } from '../ui/announcerContext.js'

const CONFIRMED = 'Thank you. Your email address is confirmed.'
const FAILED = "This link didn't work. It may be more than 24 hours old, or part of it is missing."

/**
 * The email's link ends on /?verified=1 (confirmed) or /?verified=0 (wrong or expired link).
 * The message is shown once: the address loses the parameter, so a refresh or bookmark won't
 * repeat it, and it can be dismissed.
 */
export default function VerificationResult() {
  const { user, status, refresh } = useAuth()
  const announce = useAnnounce()
  const [searchParams, setSearchParams] = useSearchParams()
  const [outcome, setOutcome] = useState(() => {
    const value = searchParams.get('verified')
    return value === '1' ? 'confirmed' : value === '0' ? 'failed' : null
  })

  useEffect(() => {
    if (!searchParams.has('verified')) return
    setSearchParams(
      (params) => {
        params.delete('verified')
        return params
      },
      { replace: true },
    )
    if (outcome === 'confirmed') refresh?.()
    if (outcome) announce(outcome === 'confirmed' ? CONFIRMED : FAILED)
  }, [searchParams, setSearchParams, outcome, announce, refresh])

  if (!outcome) return null

  const dismiss = (
    <Button variant="link" className="mt-2" onClick={() => setOutcome(null)}>
      Dismiss this message
    </Button>
  )

  if (outcome === 'confirmed' || user?.email_verified) {
    return (
      <Notice tone="success" title={CONFIRMED} className="mb-8">
        <p>You can now apply for jobs or post jobs.</p>
        {dismiss}
      </Notice>
    )
  }

  // A logged-in person who still needs to confirm has the reminder, with its button, on the page.
  if (status === 'authenticated') {
    return (
      <Notice tone="error" title={FAILED} className="mb-8">
        <p>
          Choose <span className="font-bold">Send the link again</span> in the reminder to get a new one.
        </p>
        {dismiss}
      </Notice>
    )
  }

  return (
    <Notice tone="error" title={FAILED} className="mb-8">
      <p>
        Log in, then choose <span className="font-bold">Send the link again</span> to get a new one.
      </p>
      <Link to="/login" className={`${TEXT_LINK} mr-4`}>
        Log in
      </Link>
      {dismiss}
    </Notice>
  )
}
