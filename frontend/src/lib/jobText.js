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
