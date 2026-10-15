/**
 * A trust score summary in the API shape (TrustScore::summary), shared by tests.
 */
export function trustScoreFixture(overrides = {}) {
  return {
    employer: { id: 1, name: 'Bayanihan Contact Center Inc.' },
    score: 88,
    responses: 4,
    breakdown: [
      { id: 1, name: 'Wheelchair-accessible entrance', group_name: 'Physical access', delivered: 3, partial: 0, not_delivered: 0, rated: 3 },
      { id: 4, name: 'Adjustable workstation', group_name: 'Physical access', delivered: 0, partial: 2, not_delivered: 1, rated: 3 },
    ],
    not_enough: [{ id: 7, name: 'Sign language interpreter', group_name: 'Communication' }],
    ...overrides,
  }
}

export const unscoredFixture = (overrides = {}) =>
  trustScoreFixture({ employer: { id: 2, name: 'OpenDoor Demo Corp.' }, score: null, responses: null, breakdown: null, not_enough: null, ...overrides })
