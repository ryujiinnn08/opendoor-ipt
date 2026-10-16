// Words for the dashboard charts (UI_FEEDBACK_WAVE_B_PLAN B3): week labels and the one-line
// summary each chart's caption carries, so the chart is never the only place the story is told.

const short = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const long = new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', timeZone: 'UTC' })

/** "Oct 12" for the week starting on that Monday ('YYYY-MM-DD'). */
export function weekLabel(day) {
  return short.format(new Date(`${day}T00:00:00Z`))
}

/** "Week of October 12", for tables and tooltips. */
export function weekName(day) {
  return `Week of ${long.format(new Date(`${day}T00:00:00Z`))}`
}

/** "1 application", "3 applications". */
export function countOf(count, [one, many]) {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * The takeaway of a weekly series: this week against last week, or that nothing happened yet.
 * `noun` is [singular, plural], e.g. ['application', 'applications'].
 */
export function trendText(values, noun) {
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total === 0) return `No ${noun[1]} in the last ${values.length} weeks yet.`
  const now = values.at(-1)
  const before = values.at(-2) ?? 0
  const change = now > before ? `up from ${before}` : now < before ? `down from ${before}` : 'the same as'
  return `${countOf(now, noun)} this week, ${change} last week. ${countOf(total, noun)} in ${values.length} weeks.`
}
