const dateFormat = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

/** "October 12, 2026" */
export function formatDate(iso) {
  return iso ? dateFormat.format(new Date(iso)) : ''
}

const dayFormat = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

/** "November 30, 2026" for a date without a time (e.g., a closing date), in every time zone. */
export function formatDay(day) {
  return day ? dayFormat.format(new Date(`${day}T00:00:00Z`)) : ''
}

const monthFormat = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', timeZone: 'UTC' })

/** "June 2023" for a month stored as 'YYYY-MM'. */
export function formatMonth(month) {
  return month ? monthFormat.format(new Date(`${month}-01T00:00:00Z`)) : ''
}

export const REGISTRATION_TYPES = [
  { value: 'dti', label: 'DTI', text: 'Department of Trade and Industry: sole proprietorships' },
  { value: 'sec', label: 'SEC', text: 'Securities and Exchange Commission: corporations and partnerships' },
  { value: 'cda', label: 'CDA', text: 'Cooperative Development Authority: cooperatives' },
]

export function registrationLabel(type) {
  return REGISTRATION_TYPES.find((item) => item.value === type)?.label ?? ''
}

const manilaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' })

/** "today", "yesterday", "3 days ago", or "on October 2, 2026" after a week, in Philippine days. */
export function sinceText(iso, now = new Date()) {
  if (!iso) return ''
  const days = Math.round((Date.parse(manilaDay.format(now)) - Date.parse(manilaDay.format(new Date(iso)))) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return `on ${formatDate(iso)}`
}
