/** "Maria Santos" → "MS", for round badges beside a person's name (decoration). */
export function initialsOf(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return [words[0], words.length > 1 ? words.at(-1) : null]
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join('')
}
