import { useCandidateTour } from '../../onboarding/tourContext.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { changePassword } from '../../api/auth.js'
import { useAuth } from '../../auth/authContext.js'
import { dashboardFor } from '../../auth/redirects.js'
import Button from '../../components/ui/Button.jsx'
import ErrorSummary from '../../components/ui/ErrorSummary.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import PasswordField from '../../components/ui/PasswordField.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import useFormErrors from '../../hooks/useFormErrors.js'
import { summaryFrom } from '../../lib/errorSummary.js'
import { PASSWORD_MESSAGES, checkPassword } from '../../lib/passwordRules.js'
import PageTabs from '../../components/ui/PageTabs.jsx'
import { ACCOUNT_TABS } from '../../lib/sectionTabs.js'

const FIELDS = ['current_password', 'password', 'password_confirmation']
const EMPTY = { current_password: '', password: '', password_confirmation: '' }

function validate(values, forced) {
  const errors = {}
  if (!values.current_password) errors.current_password = forced ? 'Enter your temporary password.' : 'Enter your current password.'
  const unmet = checkPassword(values.password).find((rule) => !rule.met)
  if (!values.password) errors.password = 'Enter a new password.'
  else if (unmet) errors.password = PASSWORD_MESSAGES[unmet.id]
  else if (values.password === values.current_password) errors.password = 'Choose a password different from your current one.'
  if (!values.password_confirmation) errors.password_confirmation = 'Enter your new password again.'
  else if (values.password_confirmation !== values.password) errors.password_confirmation = 'The two new passwords do not match.'
  return errors
}

/**
 * /account/password in every portal (plan PHASE_6 §4.1, F1.6, Q5). A new administrator is sent
 * here until they replace their temporary password (ProtectedRoute).
 */
export default function ChangePasswordPage() {
  const tour = useCandidateTour()
  const { user, refresh } = useAuth()
  const announce = useAnnounce()
  const [forced] = useState(Boolean(user.must_change_password))
  const [values, setValues] = useState(EMPTY)
  const { errors, generalError, focusKey, show, showApiError, clear } = useFormErrors()
  const [saving, setSaving] = useState(false)
  const [changed, setChanged] = useState(false)
  const doneRef = useRef(null)

  useEffect(() => {
    if (changed) doneRef.current?.focus()
  }, [changed])

  function update(field) {
    return (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    const clientErrors = validate(values, forced)
    if (Object.keys(clientErrors).length) return show(clientErrors)

    setSaving(true)
    try {
      await changePassword(values)
      tour?.markSaved()
      clear()
      setValues(EMPTY)
      setChanged(true)
      announce('Your password was changed.')
      // Clears must_change_password, so the rest of the portal opens.
      await refresh()
    } catch (error) {
      showApiError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={forced ? 'Choose your own password' : 'Change password'}
        documentTitle="Change password"
        intro={
          forced
            ? 'You logged in with a temporary password that someone else has seen. Choose your own before you continue.'
            : "Other devices where you're logged in are logged out. You stay logged in here."
        }
        tabs={!forced && <PageTabs label="Account settings" items={ACCOUNT_TABS} />}
      />

      {changed ? (
        <div ref={doneRef} tabIndex={-1} className="mt-8 outline-none focus-visible:ring-4 focus-visible:ring-primary">
          <Notice tone="success">
            <p className="font-bold">Your password was changed.</p>
            <p className="mt-1">Use it the next time you log in.</p>
            <Link to={dashboardFor(user.role)} className={TEXT_LINK}>
              Go to your dashboard
            </Link>
          </Notice>
        </div>
      ) : (
        <div className="mt-8">
          <ErrorSummary errors={summaryFrom(errors, FIELDS, generalError)} focusKey={focusKey} />
          <form onSubmit={handleSubmit} noValidate>
            <PasswordField
              id="current_password"
              label={forced ? 'Temporary password' : 'Current password'}
              autoComplete="current-password"
              value={values.current_password}
              onChange={update('current_password')}
              error={errors.current_password}
            />
            <PasswordField
              id="password"
              label="New password"
              autoComplete="new-password"
              value={values.password}
              onChange={update('password')}
              error={errors.password}
              showRules
            />
            <PasswordField
              id="password_confirmation"
              label="Confirm new password"
              hint="Type the new password again."
              autoComplete="new-password"
              value={values.password_confirmation}
              onChange={update('password_confirmation')}
              error={errors.password_confirmation}
            />
            <Button type="submit" loading={saving} loadingText="Changing…">
              Change password
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
