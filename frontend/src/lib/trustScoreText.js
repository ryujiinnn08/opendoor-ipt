// The words for the accommodation trust score (plan PHASE_5 §7, Q9): a whole percentage and a
// sentence, the breakdown as words. Never a ring, stars or a colour-only bar.

export const TRUST_HEADING = 'Accommodation trust score'

export const TRUST_EXPLAINED = "From hired employees' ratings of each accommodation this employer listed."

export const NOT_ENOUGH_RESPONSES = 'Not enough responses yet. The score appears once 3 hired employees have rated this employer.'

export const NOT_ENOUGH_RATINGS = 'Not enough ratings yet'

/** ", based on 5 hires" (the score itself is set in bold beside it). */
export function basedOnText(responses) {
  return `, based on ${responses} ${responses === 1 ? 'hire' : 'hires'}`
}

/** "4 of 5 delivered, 1 partly, 1 not delivered", leaving out the parts that are 0. */
export function rowText({ delivered, partial, not_delivered: notDelivered, rated }) {
  const parts = [`${delivered} of ${rated} delivered`]
  if (partial > 0) parts.push(`${partial} partly`)
  if (notDelivered > 0) parts.push(`${notDelivered} not delivered`)
  return parts.join(', ')
}

/** The one fact on job lists: "Trust score: 88% (4 hires)" or "No trust score yet". */
export function listFact(employer) {
  if (employer?.trust_score == null) return 'No trust score yet'
  return `Trust score: ${employer.trust_score}% (${employer.trust_count} ${employer.trust_count === 1 ? 'hire' : 'hires'})`
}
