// The words for applications (plan PHASE_4 §7), in one place. Statuses use the papers' names;
// the sentence under each tells the job seeker what happens next.

export const APPLICATION_STATUSES = {
  pending: { label: 'Pending', tone: 'info', icon: 'clock', next: "Sent. The employer hasn't opened it yet." },
  reviewed: {
    label: 'Reviewed',
    tone: 'info',
    icon: 'door',
    next: "The employer has opened your application. If they want to interview you, they'll contact you by email or phone.",
  },
  hired: {
    label: 'Hired',
    tone: 'success',
    icon: 'check',
    next: "Congratulations. About 30 days after your hire date, we'll ask whether each accommodation was provided.",
  },
  // Grey, not red: it isn't the person's error.
  rejected: {
    label: 'Rejected',
    tone: 'neutral',
    icon: 'minus',
    next: "The employer chose other applicants for this job. Your other applications aren't affected.",
  },
  withdrawn: { label: 'Withdrawn', tone: 'neutral', icon: 'minus', next: 'You withdrew this application.' },
}

/** My applications' filters; values match the API's `status`. */
export const APPLICATION_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'hired', label: 'Hired' },
  { value: 'closed', label: 'Closed' },
]

/** Said instead of a link to the job when it no longer takes applications. */
export const JOB_STATE_TEXT = {
  not_open: "This job isn't taking applications right now.",
  removed: 'This job was removed.',
}

export const ASK_EMPLOYER_FIRST = 'If you were hired, ask the employer to open your application on OpenDoor first.'

const INTERVIEW_HINTS = {
  online: "This job's interview is online. For example: captions, a chat option or more time.",
  on_site: "This job's interview is on-site. For example: a ground-floor room, a sign language interpreter or more time.",
  online_or_on_site: "This job's interview can be online or on-site. Say which you prefer and what you need.",
}

/** Examples for the interview accommodation request that fit the job's interview format. */
export function interviewHint(format) {
  return INTERVIEW_HINTS[format] ?? null
}

/** The Applicants page's filters; values match the API's `status`. */
export const APPLICANT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]
