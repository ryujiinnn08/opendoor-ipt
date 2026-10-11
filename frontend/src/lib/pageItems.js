const MAX_ITEMS = 7

/**
 * Page numbers to show, at most seven entries: the first and last page, the pages around the
 * current one, and 'gap' where numbers are left out. pageItems(5, 10) → [1, 'gap', 4, 5, 6, 'gap', 10]
 */
export function pageItems(current, last) {
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index)

  if (last <= MAX_ITEMS) return range(1, last)
  if (current <= 4) return [...range(1, 5), 'gap', last]
  if (current >= last - 3) return [1, 'gap', ...range(last - 4, last)]
  return [1, 'gap', current - 1, current, current + 1, 'gap', last]
}
