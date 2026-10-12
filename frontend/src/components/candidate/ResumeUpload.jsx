import { useRef, useState } from 'react'
import { getResumeFile } from '../../api/candidate.js'
import { generalErrorFrom } from '../../api/client.js'
import { formatDate } from '../../lib/format.js'
import { openPdfInNewTab } from '../../lib/openPdf.js'
import Button from '../ui/Button.jsx'
import { useAnnounce } from '../ui/announcerContext.js'
import { FieldError } from '../ui/FormField.jsx'
import { describedBy } from '../ui/fieldStyles.js'

const MAX_BYTES = 5 * 1024 * 1024

/**
 * The optional uploaded PDF résumé (plan PHASE_3 §4.1): the current file with Open, Replace and
 * Remove. It sits inside the profile form but uploads on its own, so it uses plain buttons.
 * onUpload(file) and onRemove() return promises; throw an Error with a message to show it.
 */
export default function ResumeUpload({ resume, onUpload, onRemove }) {
  const announce = useAnnounce()
  const input = useRef(null)
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null) // 'upload' | 'remove'
  const [inputKey, setInputKey] = useState(0)
  const id = 'resume-file'
  const hintId = `${id}-hint`
  const errorId = error ? `${id}-error` : null

  async function upload() {
    if (busy) return
    if (!file) return setError('Choose a PDF file first.')
    // Some computers don't know the PDF type and report it as ''; the server checks the contents.
    const isPdf = file.name.toLowerCase().endsWith('.pdf') && (file.type === 'application/pdf' || file.type === '')
    if (!isPdf) return setError('The résumé must be a PDF file.')
    if (file.size > MAX_BYTES) return setError('The résumé must be smaller than 5 MB.')

    setBusy('upload')
    setError(null)
    try {
      await onUpload(file)
      setFile(null)
      setInputKey((key) => key + 1)
      announce('Your résumé is uploaded.')
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setBusy(null)
    }
  }

  async function openResume() {
    setError(null)
    try {
      await openPdfInNewTab(getResumeFile)
    } catch (openError) {
      setError(generalErrorFrom(openError) ?? 'Something went wrong. Please try again.')
    }
  }

  async function remove() {
    if (busy) return
    setBusy('remove')
    setError(null)
    try {
      await onRemove()
      announce('Your résumé is removed.')
      // The Remove button goes away with the file.
      input.current?.focus()
    } catch (removeError) {
      setError(removeError.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      {resume ? (
        <div className="mb-4">
          <p className="font-bold">{resume.name}</p>
          <p className="text-muted">{`Uploaded ${formatDate(resume.uploaded_at)}`}</p>
          <Button variant="link" onClick={openResume} aria-label="Open my résumé (PDF, opens in a new tab)" className="-ml-1">
            Open my résumé
          </Button>
        </div>
      ) : (
        <p className="mb-4 text-muted">No PDF uploaded. Employers will see your My résumé page.</p>
      )}

      <label htmlFor={id} className="block font-bold">
        PDF résumé
      </label>
      <p id={hintId} className="mt-1 text-muted">
        A PDF, smaller than 5 MB. It uploads on its own; you don't need to save the profile.
      </p>
      {error && <FieldError id={errorId}>{error}</FieldError>}
      <input
        key={inputKey}
        ref={input}
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => {
          setError(null)
          setFile(event.target.files?.[0] ?? null)
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hintId, errorId)}
        className="mt-2 block w-full max-w-md text-sm file:mr-3 file:min-h-11 file:rounded-md file:border-2 file:border-primary file:bg-surface file:px-4 file:font-bold file:text-primary"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={upload} loading={busy === 'upload'} loadingText="Uploading…">
          {resume ? 'Replace résumé' : 'Upload résumé'}
        </Button>
        {resume && (
          <Button variant="secondary" onClick={remove} loading={busy === 'remove'} loadingText="Removing…">
            Remove résumé
          </Button>
        )}
      </div>
    </div>
  )
}
