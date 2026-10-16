import { useAuth } from '../../auth/authContext.js'
import Button from '../ui/Button.jsx'
import Notice from '../ui/Notice.jsx'
import useResendVerification from './useResendVerification.js'

// What waits for a confirmed email (EMAIL_VERIFICATION_PLAN D1).
const UNLOCKS = {
  candidate: 'You need to do this before you can apply for jobs.',
  employer: 'You need to do this before you can post jobs.',
}

/**
 * "Please confirm your email" with a button that sends the link again. Used as the reminder at the
 * top of every page and where applying or posting was refused.
 */
export default function VerifyEmailNotice({ title = 'Please confirm your email address', className = '' }) {
  const { user } = useAuth()
  const { send, sending, result } = useResendVerification()

  return (
    <Notice tone="warning" title={title} className={className}>
      <p>
        We sent a link to <span className="font-bold break-all">{user?.email}</span>. Open it to confirm your email.{' '}
        {UNLOCKS[user?.role] ?? ''}
      </p>
      <p className="mt-1">If you can&apos;t find the email, check your spam folder.</p>
      <Button variant="secondary" size="sm" className="mt-3" onClick={send} loading={sending} loadingText="Sending…">
        Send the link again
      </Button>
      {result && (
        <p className={`mt-2 font-bold ${result.tone === 'error' ? 'text-danger' : 'text-success'}`}>{result.text}</p>
      )}
    </Notice>
  )
}
