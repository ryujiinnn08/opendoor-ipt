// The match badge's words (plan PHASE_3 §7). Never a percentage.

/** "Meets 4 of 5 of your needs", "Meets all 5 …", "Meets none of your 5 needs"; one need: "Meets your need". */
export function matchCountText({ needs_total: total, needs_met: met }) {
  if (total === 1) return met === 1 ? 'Meets your need' : "Doesn't meet your need"
  if (met === total) return `Meets all ${total} of your needs`
  if (met === 0) return `Meets none of your ${total} needs`
  return `Meets ${met} of ${total} of your needs`
}

const NAMED = 2

/** "Missing: A", "Missing: A and B", "Missing: A, B and 2 more"; null when nothing is missing. */
export function missingText(names) {
  if (names.length === 0) return null
  if (names.length <= NAMED) return `Missing: ${names.join(' and ')}`
  return `Missing: ${names.slice(0, NAMED).join(', ')} and ${names.length - NAMED} more`
}

/**
 * The employer's view of an applicant's needs (plan PHASE_4 §7): "Your job meets 4 of their 5
 * needs", "…all 5 of their needs", "…none of their 5 needs"; one need: "Your job meets their need".
 */
export function employerMatchText({ needs_total: total, needs_met: met }) {
  if (total === 1) return met === 1 ? 'Your job meets their need' : "Your job doesn't meet their need"
  if (met === total) return `Your job meets all ${total} of their needs`
  if (met === 0) return `Your job meets none of their ${total} needs`
  return `Your job meets ${met} of their ${total} needs`
}
