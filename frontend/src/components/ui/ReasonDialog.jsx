import { useState } from 'react'
import Button from './Button.jsx'
import FormField from './FormField.jsx'
import Modal, { ModalClose } from './Modal.jsx'

/**
 * A confirmation dialog that needs a written reason, e.g., rejecting a company's verification.
 * onConfirm(reason) is called with the trimmed reason. The confirm button is red unless
 * `confirmVariant` says otherwise (e.g., suspending, which can be undone).
 */
export default function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label = 'Reason',
  hint,
  confirmLabel,
  confirmVariant = 'danger',
  minLength = 1,
  onConfirm,
  busy,
  error,
  onCloseAutoFocus,
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description} onCloseAutoFocus={onCloseAutoFocus}>
      {/* The dialog content unmounts when closed, so the reason starts empty each time. */}
      <ReasonForm
        label={label}
        hint={hint}
        confirmLabel={confirmLabel}
        confirmVariant={confirmVariant}
        minLength={minLength}
        onConfirm={onConfirm}
        busy={busy}
        error={error}
      />
    </Modal>
  )
}

function ReasonForm({ label, hint, confirmLabel, confirmVariant, minLength, onConfirm, busy, error }) {
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    if (!reason.trim() || reason.trim().length < minLength) {
      setFieldError(reason.trim() ? `Use at least ${minLength} characters.` : 'Enter a reason.')
      document.getElementById('reason')?.focus()
      return
    }
    setFieldError(null)
    onConfirm(reason.trim())
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <p role="alert" className="mb-4 font-bold text-danger">
          {error}
        </p>
      )}
      <FormField
        id="reason"
        as="textarea"
        rows={4}
        label={label}
        hint={hint}
        error={fieldError}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={500}
        inputClassName="w-full"
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant={confirmVariant} loading={busy} loadingText="Working…">
          {confirmLabel}
        </Button>
        <ModalClose asChild>
          <Button variant="secondary">Cancel</Button>
        </ModalClose>
      </div>
    </form>
  )
}
