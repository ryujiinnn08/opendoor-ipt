import { useState } from 'react'
import { updateUser } from '../../api/admin.js'
import { fieldErrorsFrom, generalErrorFrom } from '../../api/client.js'
import Button from '../ui/Button.jsx'
import FormField from '../ui/FormField.jsx'
import Modal, { ModalClose } from '../ui/Modal.jsx'

/**
 * Correct an account's name or email, with a reason for its history (ADMIN_USERS_PLAN U2–U4).
 * Stays open while saving, so a refusal is never lost. onSaved(updated) after a change.
 */
export default function EditUserDialog({ user, open, onOpenChange, onSaved, onCloseAutoFocus }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${user.name}'s details`}
      description={
        user.role === 'admin'
          ? 'Your reason is kept in the account’s history.'
          : 'If you change the email, they need to confirm the new address before applying or posting. Your reason is kept in the account’s history.'
      }
      onCloseAutoFocus={onCloseAutoFocus}
    >
      {/* The content unmounts when closed, so the form starts from the account each time. */}
      <EditForm user={user} onSaved={onSaved} />
    </Modal>
  )
}

function EditForm({ user, onSaved }) {
  const [values, setValues] = useState({ name: user.name, email: user.email, reason: '' })
  const [errors, setErrors] = useState({})
  const [general, setGeneral] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }))

  function check() {
    const found = {}
    if (!values.name.trim()) found.name = 'Enter their full name.'
    if (!values.email.trim()) found.email = 'Enter their email address.'
    if (values.reason.trim().length < 5) found.reason = values.reason.trim() ? 'Use at least 5 characters.' : 'Say why you are changing these details.'
    if (!found.name && !found.email && values.name.trim() === user.name && values.email.trim().toLowerCase() === user.email) {
      found.name = 'Change the name or the email first.'
    }
    return found
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    const found = check()
    setErrors(found)
    setGeneral(null)
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(`edit-${first}`)?.focus()
      return
    }
    setBusy(true)
    try {
      const updated = await updateUser(user.id, { name: values.name.trim(), email: values.email.trim(), reason: values.reason.trim() })
      onSaved(updated)
    } catch (error) {
      const fieldErrors = fieldErrorsFrom(error)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setGeneral(generalErrorFrom(error))
      setBusy(false)
      const field = Object.keys(fieldErrors)[0]
      if (field) document.getElementById(`edit-${field}`)?.focus()
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {general && (
        <p role="alert" className="mb-4 font-bold text-danger">
          {general}
        </p>
      )}
      <FormField id="edit-name" label="Full name" autoComplete="off" value={values.name} onChange={set('name')} error={errors.name} maxLength={255} inputClassName="w-full" />
      <FormField
        id="edit-email"
        label="Email address"
        type="email"
        autoComplete="off"
        spellCheck={false}
        value={values.email}
        onChange={set('email')}
        error={errors.email}
        maxLength={255}
        inputClassName="w-full"
      />
      <FormField
        id="edit-reason"
        as="textarea"
        rows={3}
        label="Why (only administrators see this)"
        hint="E.g., They asked by email to fix a typo in their name."
        value={values.reason}
        onChange={set('reason')}
        error={errors.reason}
        maxLength={300}
        inputClassName="w-full"
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy} loadingText="Saving…">
          Save changes
        </Button>
        <ModalClose asChild>
          <Button variant="secondary">Cancel</Button>
        </ModalClose>
      </div>
    </form>
  )
}
