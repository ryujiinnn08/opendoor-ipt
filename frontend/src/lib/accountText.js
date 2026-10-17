import { formatDate } from './format.js'

export const ROLE_LABELS = {
  candidate: 'Job seeker',
  employer: 'Employer',
  admin: 'Administrator',
}

export const ROLE_FILTERS = [
  { value: '', label: 'Any role' },
  { value: 'candidate', label: 'Job seekers' },
  { value: 'employer', label: 'Employers' },
  { value: 'admin', label: 'Administrators' },
]

export const STATUS_FILTERS = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

/** "Owner of Acme Corp.", "HR officer in IT at Acme Corp.", "Individual employer". */
export function employerLine(employer) {
  if (!employer) return "Hasn't set up an employer profile yet"
  if (employer.type === 'individual') return `Individual employer (${employer.name})`
  if (employer.member_role === 'owner') return `Owner of ${employer.name}`
  return employer.department ? `HR officer in ${employer.department} at ${employer.name}` : `HR officer at ${employer.name}`
}

// What suspending leaves alone, per role (plan PHASE_6 Q2).
export function keptText(user) {
  if (user.role === 'candidate') return 'Their applications stay as they are.'
  if (user.role === 'admin') return 'Nothing they decided is undone.'
  return user.postings?.length > 0
    ? 'The job postings they manage stay as they are; you can remove any of them from their page.'
    : 'Their company stays as it is.'
}

/** "Data encoder · Quezon City, Metro Manila" for a job seeker; the company line for employers. */
export function accountLine(user) {
  if (user.role === 'employer') return employerLine(user.employer)
  if (user.role !== 'candidate') return null
  const place = [user.profile?.city, user.profile?.province].filter(Boolean).join(', ')
  const line = [user.profile?.headline, place].filter(Boolean).join(' · ')
  return line || "Hasn't filled in their profile yet"
}

/** "4 applications, 1 hire" */
export function applicationCounts({ total, hires }) {
  const applications = total === 1 ? '1 application' : `${total} applications`
  return `${applications}, ${hires === 1 ? '1 hire' : `${hires} hires`}`
}

/**
 * One line of an account's history (plan PHASE_6 §7), e.g.,
 * "Suspended on October 16, 2026 by Ana Cruz:" with the reason shown under it.
 */
export function historySentence(event) {
  const when = formatDate(event.at)
  const by = event.by ? ` by ${event.by}` : ''

  switch (event.type) {
    case 'suspended':
      return `Suspended on ${when}${by}${event.reason ? ':' : '.'}`
    case 'reactivated':
      return `Reactivated on ${when}${by}.`
    case 'admin_created':
      return `Added as an administrator on ${when}${by}.`
    case 'password_changed':
      return `Password changed on ${when}.`
    case 'details_edited':
      return `Details edited on ${when}${by}${event.reason ? ':' : '.'}`
    case 'email_confirmed':
      return `Email confirmed on ${when}${by}${event.reason ? ':' : '.'}`
    default:
      return `Changed on ${when}${by}.`
  }
}

/** One line of a feedback's moderation history (plan PHASE_6 §4.5). */
export function feedbackHistorySentence(event) {
  const when = formatDate(event.at)
  const by = event.by ? ` by ${event.by}` : ''

  switch (event.type) {
    case 'hidden':
      return `Hidden from the trust score on ${when}${by}${event.reason ? ':' : '.'}`
    case 'shown':
      return `Counted in the trust score again on ${when}${by}.`
    case 'author_viewed':
      return `${event.by ?? 'An administrator'} looked at who wrote it on ${when}.`
    default:
      return `Changed on ${when}${by}.`
  }
}
