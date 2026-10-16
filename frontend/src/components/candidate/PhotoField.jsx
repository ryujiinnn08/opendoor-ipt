import { useId, useRef, useState } from 'react'
import { fieldErrorsFrom, generalErrorFrom } from '../../api/client.js'
import { getPhotoFile } from '../../api/candidate.js'
import usePrivateImage from '../../hooks/usePrivateImage.js'
import Button from '../ui/Button.jsx'
import { useAnnounce } from '../ui/announcerContext.js'
import { buttonClasses } from '../ui/buttonLinkStyles.js'
import { FieldError } from '../ui/FormField.jsx'
import Avatar from './Avatar.jsx'

const TYPES = ['image/jpeg', 'image/png']
const MAX_BYTES = 2 * 1024 * 1024

/**
 * The profile photo (UI_FEEDBACK_WAVE_B_PLAN B1): the photo or initials in a circle, and Add,
 * Change or Remove. Choosing a file uploads it at once, like the résumé. Only the job seeker sees
 * it unless they turn on "Show my photo to employers" in Private.
 *
 * onUpload(file) and onRemove() return the updated profile.
 */
export default function PhotoField({ name, profile, onUpload, onRemove }) {
  const id = useId()
  const inputRef = useRef(null)
  const announce = useAnnounce()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const src = usePrivateImage(getPhotoFile, profile.has_photo ? profile.photo_version : null)

  async function run(kind, action, done) {
    setBusy(kind)
    setError(null)
    try {
      await action()
      announce(done)
    } catch (failure) {
      const message = fieldErrorsFrom(failure).photo ?? generalErrorFrom(failure) ?? 'Something went wrong. Please try again.'
      setError(message)
      announce(message)
    } finally {
      setBusy(null)
    }
  }

  function choose(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!TYPES.includes(file.type)) return setError('Choose a JPEG or PNG photo.')
    if (file.size > MAX_BYTES) return setError('Choose a photo of 2 MB or less.')
    run('upload', () => onUpload(file), 'Photo saved.')
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar name={name} src={src} size="xl" />
      <div>
        <p id={`${id}-hint`} className="max-w-prose text-sm text-muted">
          A JPEG or PNG, at least 200 by 200 pixels, up to 2 MB. Only you see it unless you choose to show it to employers under Private.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className={`${buttonClasses('secondary', 'sm')} cursor-pointer focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus`}>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
              onChange={choose}
              disabled={busy !== null}
            />
            {busy === 'upload' ? 'Saving…' : profile.has_photo ? 'Change photo' : 'Add a photo'}
          </label>
          {profile.has_photo && (
            <Button variant="danger-outline" size="sm" loading={busy === 'remove'} loadingText="Removing…" onClick={() => run('remove', onRemove, 'Photo removed.')}>
              Remove photo
            </Button>
          )}
        </div>
        {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      </div>
    </div>
  )
}
