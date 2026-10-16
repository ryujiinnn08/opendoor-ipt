import { TEAM_EMAIL } from '../../lib/contact.js'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { useEffect, useRef, useState } from 'react'
import { sendContactMessage } from '../../api/contact.js'
import { fieldErrorsFrom, generalErrorFrom } from '../../api/client.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import Button from '../../components/ui/Button.jsx'
import ErrorSummary from '../../components/ui/ErrorSummary.jsx'
import FormField from '../../components/ui/FormField.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeading from '../../components/ui/PageHeading.jsx'
import { summaryFrom } from '../../lib/errorSummary.js'

const FIELDS = ['name', 'email', 'message']
const MESSAGE_MAX = 2000
const EMPTY = { name: '', email: '', message: '', website: '' }

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Enter your name.'
  if (!values.email.trim()) errors.email = 'Enter your email address.'
  const message = values.message.trim()
  if (!message) errors.message = 'Write your message.'
  else if (message.length < 10) errors.message = 'Write at least 10 characters so we can understand your message.'
  else if (message.length > MESSAGE_MAX) errors.message = `Your message must be ${MESSAGE_MAX.toLocaleString()} characters or fewer.`
  return errors
}

/** "Contact us": a short form that emails the OpenDoor team. */
export default function ContactPage() {
  const announce = useAnnounce()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)
  const [focusKey, setFocusKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [sentMessage, setSentMessage] = useState(null)
  const sentBox = useRef(null)

  // After sending, focus (and the view) goes to the "Message sent" box above the emptied form.
  useEffect(() => {
    if (sentMessage) sentBox.current?.focus()
  }, [sentMessage])

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
    // A new try hides the last "Message sent", so the box (and its focus) comes back for each send.
    setSentMessage(null)

    const clientErrors = validate(values)
    if (Object.keys(clientErrors).length) return showErrors(clientErrors)

    setSubmitting(true)
    try {
      const thanks = await sendContactMessage({
        name: values.name.trim(),
        email: values.email.trim(),
        message: values.message.trim(),
        website: values.website,
      })
      setSentMessage(thanks)
      setValues(EMPTY)
      setErrors({})
      setGeneralError(null)
      announce(thanks)
    } catch (error) {
      // The server words its "cannot send right now" (503) reply for people; show it as written.
      const unavailable = error?.response?.status === 503 ? error.response.data?.message : null
      showErrors(fieldErrorsFrom(error), unavailable || generalErrorFrom(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeading>Contact us</PageHeading>
      <p className="mt-6 text-lg">
        Job seekers and employers can use this form for account help, accessibility problems or privacy requests. Your message goes to the OpenDoor team, who will reply by email.
      </p>

      <p className="mt-3">
        You can also email <a href={`mailto:${TEAM_EMAIL}`} className={TEXT_LINK}>{TEAM_EMAIL}</a>.
        {' '}To apply for a job, use its application page.
      </p>

      {sentMessage && (
        <div ref={sentBox} tabIndex={-1} className="mt-6 focus:outline-3 focus:outline-offset-4 focus:outline-(--od-focus)">
          <Notice tone="success" title="Message sent">
            <p>{sentMessage}</p>
          </Notice>
        </div>
      )}

      <div className="mt-8">
        <ErrorSummary errors={summaryFrom(errors, FIELDS, generalError)} focusKey={focusKey} />

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            id="name"
            label="Your name"
            autoComplete="name"
            maxLength={100}
            value={values.name}
            onChange={update('name')}
            error={errors.name}
          />
          <FormField
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            spellCheck={false}
            hint="We will reply to this address."
            value={values.email}
            onChange={update('email')}
            error={errors.email}
          />
          <FormField
            id="message"
            label="Your message"
            as="textarea"
            rows={6}
            hint={`Up to ${MESSAGE_MAX.toLocaleString()} characters. Please do not include passwords.`}
            inputClassName="w-full max-w-xl"
            value={values.message}
            onChange={update('message')}
            error={errors.message}
          />

          {/* A trap for bots: people never see or reach it, so only a bot fills it in. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="website">Leave this field empty</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={values.website}
              onChange={update('website')}
            />
          </div>

          <Button type="submit" loading={submitting} loadingText="Sending…">
            Send message
          </Button>
        </form>
      </div>
    </div>
  )
}
