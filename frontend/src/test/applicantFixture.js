/**
 * An application in the employer's API shape (ApplicantResource), shared by tests.
 */
export function applicantFixture(overrides = {}) {
  return {
    id: 21,
    status: 'reviewed',
    status_label: 'Reviewed',
    applied_at: '2026-10-13T02:00:00+00:00',
    reviewed_at: '2026-10-14T03:00:00+00:00',
    rejected_at: null,
    withdrawn_at: null,
    hired_at: null,
    hire_confirmed_by: null,
    actions: ['hire', 'reject'],
    applicant: { name: 'Maria Santos', headline: 'Bookkeeper with 3 years of experience' },
    has_interview_request: true,
    match: { needs_total: 5, needs_met: 4, missing: ['Sign language interpreter'] },
    ...overrides,
  }
}

/** The applicant page's shape: the list shape plus the job, messages, each need and the profile. */
export function applicantDetailFixture(overrides = {}) {
  return applicantFixture({
    job: { id: 2, title: 'Junior Web Developer', interview_format: 'online', status: 'open', department: { name: 'IT' } },
    cover_note: 'I have three years of bookkeeping.\nI would love to learn.',
    interview_request: 'Online interview with captions, please.',
    match: {
      needs_total: 2,
      needs_met: 1,
      missing: ['Sign language interpreter'],
      needs: [
        { id: 1, name: 'Flexible hours', group_name: 'Work arrangement', provided: true, note: 'Start between 7 and 10 a.m.' },
        { id: 2, name: 'Sign language interpreter', group_name: 'Communication', provided: false, note: null },
      ],
    },
    profile: {
      name: 'Maria Santos',
      email: 'maria@example.com',
      headline: 'Bookkeeper with 3 years of experience',
      city: 'Quezon City',
      province: 'Metro Manila',
      contact_number: '0917 555 0199',
      about: null,
      skills: 'Bookkeeping',
      trainings: null,
      languages: 'Filipino, English',
      disability_type: null,
      show_disability: false,
      experiences: [],
      educations: [],
      resume: { name: 'maria.pdf', uploaded_at: '2026-10-11T00:00:00+00:00' },
    },
    ...overrides,
  })
}

/** A withdrawn applicant: only the name and dates (Q4). */
export const withdrawnApplicantFixture = {
  id: 22,
  status: 'withdrawn',
  status_label: 'Withdrawn',
  applied_at: '2026-10-13T02:00:00+00:00',
  reviewed_at: null,
  rejected_at: null,
  withdrawn_at: '2026-10-15T02:00:00+00:00',
  hired_at: null,
  hire_confirmed_by: null,
  actions: [],
  applicant: { name: 'Juan Cruz' },
}
