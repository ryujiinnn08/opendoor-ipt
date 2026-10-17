import TeamContact from '../../components/ui/TeamContact.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fieldErrorsFrom, generalErrorFrom, isAccountSuspended, SUSPENDED_KEY } from '../../api/client.js'
import { useAuth } from '../../auth/authContext.js'
import { dashboardFor, safeNext } from '../../auth/redirects.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import Button from '../../components/ui/Button.jsx'
import ErrorSummary from '../../components/ui/ErrorSummary.jsx'
import { summaryFrom } from '../../lib/errorSummary.js'
import FormField from '../../components/ui/FormField.jsx'
import Notice from '../../components/ui/Notice.jsx'
import AuthScene from '../../components/layout/AuthScene.jsx'
import MascotMessage from '../../components/mascot/MascotMessage.jsx'
import PageHeading from '../../components/ui/PageHeading.jsx'
import PasswordField from '../../components/ui/PasswordField.jsx'

const FIELDS = ['email', 'password']

function validate(values) {
  const errors = {}
  if (!values.email.trim()) errors.email = 'Enter your email address.'
  if (!values.password) errors.password = 'Enter your password.'
  return errors
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)
  const [focusKey, setFocusKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  // A suspended account: refused at log in, or sent here when the API ended the session.
  const [suspended, setSuspended] = useState(() => {
    try {
      const flagged = window.sessionStorage.getItem(SUSPENDED_KEY) === '1'
      window.sessionStorage.removeItem(SUSPENDED_KEY)
      return flagged
    } catch {
      return false
    }
  })
  const suspendedHeading = useRef(null)
  useEffect(() => {
    if (suspended) suspendedHeading.current?.focus()
  }, [suspended])

  function update(field) {
    return (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  function showErrors(fieldErrors, general = null) {
    setErrors(fieldErrors)
    setGeneralError(general)
    setFocusKey((key) => key + 1)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const clientErrors = validate(values)
    if (Object.keys(clientErrors).length) return showErrors(clientErrors)

    setSubmitting(true)
    setSuspended(false)
    try {
      const user = await login({ email: values.email.trim(), password: values.password })
      announce(`Logged in. Welcome, ${user.name}.`)
      navigate(next ?? dashboardFor(user.role), { replace: true })
    } catch (error) {
      if (isAccountSuspended(error)) {
        setSuspended(true)
        setErrors({})
        setGeneralError(null)
      } else {
        showErrors(fieldErrorsFrom(error), generalErrorFrom(error))
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthScene>
      <div className="max-w-xl">
        <PageHeading>Log in</PageHeading>

        {next && (
          <Notice tone="info" className="mt-6">
            Log in to continue to that page.
          </Notice>
        )}

        {suspended && (
          <MascotMessage
            mood="sad"
            role="alert"
            title="Your account is on hold"
            headingId="suspended-heading"
            headingRef={suspendedHeading}
            className="mt-6"
            action={
              <Link to="/contact" className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 hover:no-underline">
                Contact the OpenDoor team
              </Link>
            }
          >
            <p>This account has been suspended, so you can&apos;t log in right now. If you think that&apos;s a mistake, the OpenDoor team can help.</p>
          </MascotMessage>
        )}

        <div className="mt-8">
          <ErrorSummary errors={summaryFrom(errors, FIELDS, generalError)} focusKey={focusKey} />

          <form onSubmit={handleSubmit} noValidate>
            <FormField
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              spellCheck={false}
              value={values.email}
              onChange={update('email')}
              error={errors.email}
            />
            <PasswordField
              id="password"
              label="Password"
              autoComplete="current-password"
              value={values.password}
              onChange={update('password')}
              error={errors.password}
            />
            <Button type="submit" loading={submitting} loadingText="Logging in…">
              Log in
            </Button>
          </form>

          <TeamContact />

          <p className="mt-8">
            New to OpenDoor?{' '}
            <Link to="/register" className="font-bold text-primary underline underline-offset-4 hover:no-underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </AuthScene>
  )
}
