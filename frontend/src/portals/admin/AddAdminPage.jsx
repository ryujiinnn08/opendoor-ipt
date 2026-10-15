import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addAdmin } from '../../api/admin.js'
import Button from '../../components/ui/Button.jsx'
import CopyLinkBox from '../../components/ui/CopyLinkBox.jsx'
import ErrorSummary from '../../components/ui/ErrorSummary.jsx'
import FormField from '../../components/ui/FormField.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import useFormErrors from '../../hooks/useFormErrors.js'
import { summaryFrom } from '../../lib/errorSummary.js'

const FIELDS = ['name', 'email']

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = "Enter the administrator's full name."
  if (!values.email.trim()) errors.email = "Enter the administrator's email address."
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = 'Enter an email address in the correct format, like name@example.com.'
  return errors
}

/**
 * /admin/users/new: name and email; OpenDoor makes a temporary password, shown once here and
 * never again (plan PHASE_6 §4.1, Q4). The new administrator changes it after logging in.
 */
export default function AddAdminPage() {
  const announce = useAnnounce()
  const [values, setValues] = useState({ name: '', email: '' })
  const { errors, generalError, focusKey, show, showApiError, clear } = useFormErrors()
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null) // { user, password }
  const resultHeading = useRef(null)

  useEffect(() => {
    if (created) resultHeading.current?.focus()
  }, [created])

  function update(field) {
    return (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    const clientErrors = validate(values)
    if (Object.keys(clientErrors).length) return show(clientErrors)

    setSaving(true)
    try {
      const { user, temporaryPassword } = await addAdmin({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
      })
      clear()
      setCreated({ user, password: temporaryPassword })
      announce(`${user.name} is now an administrator.`)
    } catch (error) {
      showApiError(error)
    } finally {
      setSaving(false)
    }
  }

  function addAnother() {
    setCreated(null)
    setValues({ name: '', email: '' })
    requestAnimationFrame(() => document.getElementById('name')?.focus())
  }

  if (created) {
    const { user, password } = created
    return (
      <div className="max-w-2xl">
        <PageHeader title="Add an administrator" />
        <section aria-labelledby="created-heading" className="mt-8 rounded-lg border-2 border-success bg-surface p-5 sm:p-6">
          <h2 ref={resultHeading} id="created-heading" tabIndex={-1} className="text-2xl font-bold outline-none">
            {user.name} is now an administrator
          </h2>
          <p className="mt-2 max-w-prose">
            {user.name} can now log in as {user.email} with this temporary password. Copy it and give it to them privately;
            it won't be shown again. They'll be asked to change it.
          </p>
          <div className="mt-4">
            <CopyLinkBox id="temporary-password" label="Temporary password" value={password} thing="password" />
          </div>
        </section>
        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-2">
          <li>
            <Link to={`/admin/users/${user.id}`} className={TEXT_LINK}>
              Open {user.name}'s account
            </Link>
          </li>
          <li>
            <Button variant="link" onClick={addAnother}>
              Add another administrator
            </Button>
          </li>
        </ul>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Add an administrator"
        intro="Administrators verify companies, approve postings and manage accounts. OpenDoor makes a temporary password for them, which you give them yourself."
      />
      <div className="mt-8">
        <ErrorSummary errors={summaryFrom(errors, FIELDS, generalError)} focusKey={focusKey} />
        <form onSubmit={handleSubmit} noValidate>
          <FormField id="name" label="Full name" autoComplete="off" value={values.name} onChange={update('name')} error={errors.name} />
          <FormField
            id="email"
            label="Email address"
            hint="They log in with this."
            type="email"
            autoComplete="off"
            spellCheck={false}
            value={values.email}
            onChange={update('email')}
            error={errors.email}
          />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button type="submit" loading={saving} loadingText="Adding…">
              Add administrator
            </Button>
            <Link to="/admin/users" className={TEXT_LINK}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
