/** "15 jobs", "1 job", "No jobs" (read out with " found" after it). */
export function jobCountText(total) {
  if (!total) return 'No jobs'
  return total === 1 ? '1 job' : `${total} jobs`
}

const SHOWN = 3

/**
 * The first three items and how many more there are, with the word that goes before each shown
 * item: '' for the first, ' and ' before the last when nothing follows, ', ' otherwise.
 */
export function providesParts(items) {
  const shown = items.slice(0, SHOWN)
  const more = items.length - shown.length
  return {
    shown: shown.map((item, index) => {
      if (index === 0) return { item, before: '' }
      return { item, before: index === shown.length - 1 && more === 0 ? ' and ' : ', ' }
    }),
    more,
  }
}

/** "Provides A", "Provides A and B", "Provides A, B and C", "Provides A, B, C and 2 more". */
export function providesText(names) {
  const { shown, more } = providesParts(names)
  const list = shown.map(({ item, before }) => `${before}${item}`).join('')
  return `Provides ${list}${more > 0 ? ` and ${more} more` : ''}`
}

const DAY = 24 * 60 * 60 * 1000
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY)

/**
 * Small labels on a job card (UI_FEEDBACK_PLAN §2), from data the job already has: "New" in its
 * first 3 days, "Closing soon" in its last 7. `today` is Manila's date, 'YYYY-MM-DD'.
 */
export function jobLabels(job, today) {
  const labels = []
  if (job.posted_on && daysBetween(job.posted_on, today) <= 3) labels.push('New')
  if (job.closes_on && daysBetween(today, job.closes_on) <= 7) labels.push('Closing soon')
  return labels
}
