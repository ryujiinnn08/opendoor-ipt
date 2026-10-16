import { useCallback, useState } from 'react'
import { resendVerification } from '../../api/auth.js'
import { generalErrorFrom } from '../../api/client.js'
import { useAuth } from '../../auth/authContext.js'
import { useAnnounce } from '../ui/announcerContext.js'

/**
 * "Send the link again": the request, its visible result ({ tone, text }) and the same text read
 * out to screen readers. If the email was confirmed in another tab, the user is reloaded so the
 * reminders disappear.
 */
export default function useResendVerification() {
  const { refresh } = useAuth()
  const announce = useAnnounce()
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const send = useCallback(async () => {
    setSending(true)
    let next
    try {
      const data = await resendVerification()
      next = { tone: 'success', text: data.message }
      if (data.email_verified) refresh?.()
    } catch (error) {
      const text =
        error?.response?.status === 429
          ? 'You asked for several links in a short time. Please wait a minute, then try again.'
          : generalErrorFrom(error)
      next = { tone: 'error', text }
    }
    setResult(next)
    announce(next.text)
    setSending(false)
  }, [announce, refresh])

  return { send, sending, result }
}
