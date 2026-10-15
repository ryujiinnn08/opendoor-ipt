import { employerKind } from '../../auth/employerAccess.js'

// Menu items per portal. Pages from later phases are added here as they are built.
// `end: false` keeps an item marked on its sub-pages (e.g., a posting's edit page).
const JOB_POSTINGS = { to: '/employer/job-postings', label: 'Job postings', end: false }
const TRUST_SCORE = { to: '/employer/trust-score', label: 'Trust score' }

const EMPLOYER_MENUS = {
  none: [{ to: '/employer/setup', label: 'Set up your profile' }],
  owner: [
    { to: '/employer/dashboard', label: 'Dashboard' },
    { to: '/employer/company', label: 'Company profile' },
    { to: '/employer/team', label: 'Team' },
    JOB_POSTINGS,
    TRUST_SCORE,
  ],
  hr: [{ to: '/employer/dashboard', label: 'Dashboard' }, JOB_POSTINGS, TRUST_SCORE],
  individual: [
    { to: '/employer/dashboard', label: 'Dashboard' },
    { to: '/employer/profile', label: 'My profile' },
    JOB_POSTINGS,
    TRUST_SCORE,
  ],
}

const PORTALS = {
  candidate: {
    name: 'Candidate portal',
    menu: [
      { to: '/candidate/dashboard', label: 'Dashboard' },
      { to: '/candidate/jobs', label: 'Find jobs', end: false },
      { to: '/candidate/applications', label: 'My applications', end: false },
      { to: '/candidate/needs', label: 'My needs' },
      { to: '/candidate/profile', label: 'My profile', end: false },
    ],
  },
  admin: {
    name: 'Admin portal',
    menu: [
      { to: '/admin/dashboard', label: 'Dashboard' },
      { to: '/admin/users', label: 'Users', end: false },
      { to: '/admin/categories', label: 'Categories' },
      { to: '/admin/accommodations', label: 'Accommodation types' },
      { to: '/admin/employers', label: 'Employer verification' },
      { to: '/admin/job-postings', label: 'Posting approvals', end: false },
      { to: '/admin/settings', label: 'Settings' },
    ],
  },
}

/** { name, menu } for the logged-in user's portal. */
export function portalFor(user) {
  if (user.role === 'employer') {
    return { name: 'Employer portal', menu: EMPLOYER_MENUS[employerKind(user)] }
  }
  return PORTALS[user.role]
}
