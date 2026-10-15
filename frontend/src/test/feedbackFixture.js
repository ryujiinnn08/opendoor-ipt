/**
 * The feedback form in the API shape (FeedbackFormResource), shared by tests.
 */
export function feedbackFormFixture(overrides = {}) {
  return {
    application_id: 7,
    job: { id: 2, title: 'Office Clerk' },
    employer: { id: 1, name: 'OpenDoor Demo Corp.' },
    hired_at: '2026-09-14',
    state: 'open',
    opens_on: '2026-10-14',
    accommodations: [
      { id: 10, name: 'Wheelchair-accessible entrance', group_name: 'Physical access', note: 'Ramp at the main entrance.' },
      { id: 11, name: 'Flexible hours', group_name: 'Work arrangement', note: null },
    ],
    sent: null,
    ...overrides,
  }
}

export function sentFeedbackFixture(overrides = {}) {
  return feedbackFormFixture({
    state: 'sent',
    sent: {
      sent_at: '2026-10-15T03:00:00+00:00',
      comment: 'The ramp was blocked on Mondays.',
      ratings: [
        { accommodation_id: 10, name: 'Wheelchair-accessible entrance', group_name: 'Physical access', note: 'Ramp at the main entrance.', rating: 'partial', rating_label: 'Partly delivered' },
        { accommodation_id: 11, name: 'Flexible hours', group_name: 'Work arrangement', note: null, rating: 'not_used', rating_label: "I didn't use this" },
      ],
    },
    ...overrides,
  })
}
