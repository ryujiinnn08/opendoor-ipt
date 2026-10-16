import { employerKind } from '../../auth/employerAccess.js'

// The header's links (UI_REVAMP_PLAN Q4): `left` of the logo are the role's pages, `right` are
// the person's own. `end: false` keeps an item current on its sub-pages (e.g., a posting's edit
// page); `match` lists other address prefixes that belong to it (e.g., Profile's three tabs).
const JOB_POSTINGS = { to: '/employer/job-postings', label: 'Job postings', icon: 'briefcase', end: false, match: ['/employer/applications'] }
const TRUST_SCORE = { to: '/employer/trust-score', label: 'Trust score', icon: 'shield-check' }
const DASHBOARD = (role) => ({ to: `/${role}/dashboard`, label: 'Dashboard', icon: 'home' })

const EMPLOYER_MENUS = {
  none: [{ to: '/employer/setup', label: 'Set up your profile', icon: 'building' }],
  owner: [
    DASHBOARD('employer'),
    JOB_POSTINGS,
    { to: '/employer/company', label: 'Company', icon: 'building' },
    { to: '/employer/team', label: 'Team', icon: 'people' },
    TRUST_SCORE,
  ],
  hr: [DASHBOARD('employer'), JOB_POSTINGS, TRUST_SCORE],
  individual: [DASHBOARD('employer'), JOB_POSTINGS, { to: '/employer/profile', label: 'My profile', icon: 'user' }, TRUST_SCORE],
}

export const GUEST_MENU = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/jobs', label: 'Find jobs', icon: 'search', end: false, match: ['/employers'] },
]

const PORTALS = {
  candidate: {
    left: [
      DASHBOARD('candidate'),
      { to: '/candidate/jobs', label: 'Find jobs', icon: 'search', end: false, match: ['/candidate/employers'] },
      { to: '/candidate/applications', label: 'Applications', icon: 'file-text', end: false },
    ],
    right: [{ to: '/candidate/needs', label: 'Profile', icon: 'user', match: ['/candidate/profile'] }],
  },
  admin: {
    left: [
      DASHBOARD('admin'),
      { to: '/admin/employers', label: 'Employers', icon: 'building' },
      { to: '/admin/job-postings', label: 'Postings', icon: 'clipboard-check', end: false },
      { to: '/admin/users', label: 'Users', icon: 'people', end: false },
    ],
    right: [
      { to: '/admin/feedback', label: 'Feedback', icon: 'chat' },
      { to: '/admin/categories', label: 'Data', icon: 'panel', match: ['/admin/accommodations', '/admin/settings'] },
    ],
  },
}

export const ACCOUNT_ITEM = { to: '/account/display', label: 'Account', icon: 'user', match: ['/account'] }

/** { left, right } menu items for the logged-in user's portal. */
export function portalFor(user) {
  if (user.role === 'employer') return { left: EMPLOYER_MENUS[employerKind(user)], right: [] }
  return PORTALS[user.role]
}

/** Whether `item` is the page at `pathname` (or one of its sub-pages or tabs). */
export function isCurrent(item, pathname) {
  if (pathname === item.to) return true
  if (item.end === false && pathname.startsWith(`${item.to}/`)) return true
  return (item.match ?? []).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
