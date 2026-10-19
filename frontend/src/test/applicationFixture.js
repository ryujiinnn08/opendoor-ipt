/**
 * An application in the job seeker's API shape (CandidateApplicationResource), shared by tests.
 */
export function applicationFixture(overrides = {}) {
  return {
    id: 7,
    status: 'pending',
    status_label: 'Pending',
    applied_at: '2026-10-13T02:00:00+00:00',
    reviewed_at: null,
    rejected_at: null,
    withdrawn_at: null,
    hired_at: null,
    hire_confirmed_by: null,
    cover_note: 'I have three years of bookkeeping.\nI would love to learn.',
    interview_request: 'Online interview with captions, please.',
    actions: [],
    feedback: null,
    job: {
      id: 2,
      title: 'Junior Web Developer',
      interview_format: 'online',
      state: 'open',
      employer: { id: 1, name: 'Acme Corp.', type: 'company', is_verified: true },
    },
    ...overrides,
  }
}

export const reviewedFixture = (overrides = {}) =>
  applicationFixture({ status: 'reviewed', status_label: 'Reviewed', reviewed_at: '2026-10-14T03:00:00+00:00', actions: [], ...overrides })
