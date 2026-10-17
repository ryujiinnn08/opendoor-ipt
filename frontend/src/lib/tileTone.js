const TILE_TONES = ['orange', 'pink', 'sky', 'lilac', 'yellow']

/** A steady IconTile tone for a record (e.g., a job), so its tile keeps its colour between visits. */
export function toneFor(id) {
  return TILE_TONES[Math.abs(Number(id) || 0) % TILE_TONES.length]
}
