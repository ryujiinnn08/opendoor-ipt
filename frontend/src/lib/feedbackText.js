import { formatDate, formatDay } from './format.js'

// The words for accommodation feedback (plan PHASE_5 §7), in one place.

/** The four answers, in order; values match the API. "I didn't use this" doesn't count (Q1). */
export const RATING_CHOICES = [
  { value: 'delivered', label: 'Delivered' },
  { value: 'partial', label: 'Partly delivered' },
  { value: 'not_delivered', label: 'Not delivered' },
  { value: 'not_used', label: "I didn't use this" },
]

export const RATE_ACTION = 'Rate the accommodations'

export const NOTHING_TO_RATE = "This job listed no accommodations, so there's nothing to rate."

export const AT_LEAST_ONE = 'Rate at least one accommodation you used.'

export const COMMENT_HINT = "Only OpenDoor's administrators read this. Your employer never sees it."

export const PRIVACY_TEXT = "Only OpenDoor's administrators see your answers with your name. Your employer sees only totals from 3 or more people."

/** "You can rate your employer's accommodations from November 12, 2026." */
export function opensOnText(day) {
  return `You can rate your employer's accommodations from ${formatDay(day)}.`
}

/** "Choose an answer for Flexible hours." */
export function missingAnswerText(name) {
  return `Choose an answer for ${name}.`
}

/** "Thank you. Your ratings now count toward OpenDoor Demo Corp.'s trust score." */
export function thankYouText(employerName) {
  return `Thank you. Your ratings now count toward ${employerName}'s trust score.`
}

/** "You rated the accommodations on October 15, 2026." */
export function sentText(sentAt) {
  return `You rated the accommodations on ${formatDate(sentAt)}.`
}

/** The first radio of an accommodation's answers: where the error summary sends focus. */
export function firstChoiceId(accommodationId) {
  return `rating-${accommodationId}-${RATING_CHOICES[0].value}`
}
