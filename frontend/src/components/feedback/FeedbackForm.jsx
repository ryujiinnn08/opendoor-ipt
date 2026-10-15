import { useRef, useState } from 'react'
import { sendFeedback } from '../../api/feedback.js'
import { fieldErrorsFrom, generalErrorFrom } from '../../api/client.js'
import useFormErrors from '../../hooks/useFormErrors.js'
import { summaryFrom } from '../../lib/errorSummary.js'
import { AT_LEAST_ONE, COMMENT_HINT, RATING_CHOICES, firstChoiceId, missingAnswerText } from '../../lib/feedbackText.js'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import ErrorSummary from '../ui/ErrorSummary.jsx'
import FormField, { FieldError } from '../ui/FormField.jsx'

/**
 * One accommodation as it was promised (amber rule, the employer's note) with the four answers
 * under it. The legend is the accommodation, so a screen reader hears "Flexible hours, Delivered,
 * radio button, 1 of 4".
 */
function RatingRow({ item, value, onChange, error }) {
  const noteId = item.note ? `rating-${item.id}-note` : null
  const errorId = error ? `rating-${item.id}-error` : null

  return (
    <div className="border-l-4 border-accent pl-5">
      <fieldset aria-describedby={[noteId, errorId].filter(Boolean).join(' ') || undefined}>
        <legend className="text-xl font-bold">{item.name}</legend>
        {item.note && (
          <p id={noteId} className="text-muted">
            “{item.note}”
          </p>
        )}
        {error && <FieldError id={errorId}>{error}</FieldError>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {RATING_CHOICES.map((choice) => {
            const id = `rating-${item.id}-${choice.value}`
            return (
              <label
                key={choice.value}
                htmlFor={id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border-2 border-border bg-surface px-3 py-2 has-checked:border-primary has-checked:bg-primary-soft"
              >
                <input
                  id={id}
                  type="radio"
                  name={`rating-${item.id}`}
                  value={choice.value}
                  checked={value === choice.value}
                  onChange={() => onChange(item.id, choice.value)}
                  aria-invalid={error ? true : undefined}
                  className="size-6 shrink-0 accent-primary"
                />
                <span>{choice.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}

/** Server errors keyed for the summary: `ratings.12` → the first radio of that row. */
function mapServerErrors(fieldErrors) {
  const mapped = {}
  let general = null
  for (const [key, message] of Object.entries(fieldErrors)) {
    const row = /^ratings\.(\d+)$/.exec(key)
    if (row) mapped[firstChoiceId(row[1])] = message
    else if (key === 'comment') mapped.comment = message
    else general = message
  }
  return { mapped, general }
}

/**
 * The feedback form (papers' FeedbackForm, F7.1, F7.2): one answer per accommodation copied at
 * the hire, an optional comment read only by admins, and Send once confirmed. Feedback can't be
 * changed after sending (Q5). `onSent(form)` runs once the dialog has closed; `onAlreadySent`
 * when the server says it was sent meanwhile (another tab).
 */
export default function FeedbackForm({ form, onSent, onAlreadySent }) {
  const [answers, setAnswers] = useState({})
  const [comment, setComment] = useState('')
  const [dialog, setDialog] = useState(null) // { open, busy, error }
  const { errors, generalError, focusKey, show, clear } = useFormErrors()
  const outcome = useRef(null) // { sent } | { fieldErrors } | { already: true }
  const items = form.accommodations

  function rowError(id) {
    return errors[firstChoiceId(id)]
  }

  function handleSubmit(event) {
    event.preventDefault()
    const missing = Object.fromEntries(items.filter((item) => !answers[item.id]).map((item) => [firstChoiceId(item.id), missingAnswerText(item.name)]))
    if (Object.keys(missing).length > 0) return show(missing)
    if (items.every((item) => answers[item.id] === 'not_used')) return show({}, AT_LEAST_ONE)
    clear()
    setDialog({ open: true, busy: false, error: null })
  }

  async function confirm() {
    setDialog((current) => ({ ...current, busy: true, error: null }))
    try {
      outcome.current = { sent: await sendFeedback(form.application_id, { ratings: answers, comment: comment.trim() || null }) }
      setDialog((current) => ({ ...current, open: false, busy: false }))
    } catch (error) {
      const status = error?.response?.status
      const fieldErrors = fieldErrorsFrom(error)
      if (status === 409) {
        outcome.current = { already: true }
        setDialog((current) => ({ ...current, open: false, busy: false }))
      } else if (Object.keys(fieldErrors).length > 0) {
        outcome.current = { fieldErrors }
        setDialog((current) => ({ ...current, open: false, busy: false }))
      } else {
        setDialog((current) => ({ ...current, busy: false, error: generalErrorFrom(error) ?? 'Something went wrong. Please try again.' }))
      }
    }
  }

  function closeDialog(open) {
    if (!open) setDialog((current) => (current && !current.busy ? { ...current, open: false } : current))
  }

  // Runs once the dialog has closed, so focus lands where the result is, not back on Send.
  function afterClose(event) {
    const result = outcome.current
    outcome.current = null
    setDialog(null)
    if (!result) return
    event.preventDefault()
    if (result.sent) onSent(result.sent)
    else if (result.already) onAlreadySent?.()
    else {
      const { mapped, general } = mapServerErrors(result.fieldErrors)
      show(mapped, general)
    }
  }

  const order = [...items.map((item) => firstChoiceId(item.id)), 'comment']

  return (
    <>
    <form onSubmit={handleSubmit} noValidate>
      <ErrorSummary errors={summaryFrom(errors, order, generalError)} focusKey={focusKey} />
      <div className="space-y-8">
        {items.map((item) => (
          <RatingRow
            key={item.id}
            item={item}
            value={answers[item.id]}
            error={rowError(item.id)}
            onChange={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))}
          />
        ))}
      </div>
      <FormField
        id="comment"
        as="textarea"
        label="Comment"
        optional
        hint={COMMENT_HINT}
        rows={5}
        maxLength={1000}
        className="mt-10"
        inputClassName="w-full max-w-prose"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        error={errors.comment}
      />
      <Button type="submit">Send your ratings</Button>
    </form>
      <ConfirmDialog
        open={Boolean(dialog?.open)}
        onOpenChange={closeDialog}
        title="Send your ratings?"
        description="You can't change them afterwards."
        confirmLabel="Send your ratings"
        confirmVariant="primary"
        onConfirm={confirm}
        busy={Boolean(dialog?.busy)}
        error={dialog?.error}
        onCloseAutoFocus={afterClose}
      />
    </>
  )
}
