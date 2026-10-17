import { useAuth } from '../../auth/authContext.js'
import VerifyEmailNotice from './VerifyEmailNotice.jsx'

/**
 * The reminder shown in the public and portal layouts while a job seeker's or employer's email is
 * not confirmed. Administrators are never asked.
 */
export default function EmailVerificationBanner({ className = 'mb-8' }) {
  const { user } = useAuth()
  const asked = user?.role === 'candidate' || user?.role === 'employer'

  if (!asked || user.email_verified !== false) return null

  return <div data-tour="email-verification"><VerifyEmailNotice className={className} /></div>
}
