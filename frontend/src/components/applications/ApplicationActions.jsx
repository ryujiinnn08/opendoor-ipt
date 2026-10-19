import Icon from '../ui/Icon.jsx'

/** Applicant status is read-only, including when a stale response advertises old actions. */
export default function ApplicationActions({ explainHire = false }) {
  return explainHire ? <p className="mt-3 flex max-w-prose items-start gap-2 rounded-md border border-border bg-subtle p-3 text-sm text-muted"><Icon name="lock" className="mt-0.5 size-4" /><span>Only the employer can update your application status. Please wait for their decision.</span></p> : null
}
