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
