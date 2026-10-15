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
    default:
      return `Changed on ${when}${by}.`
  }
}
