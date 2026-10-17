import { describe, expect, it } from 'vitest'
import { tourGeometry } from './tourGeometry.js'

describe('spotlight and coachmark geometry', () => {
  it('keeps a card beside a feature without covering it', () => {
    const { spotlight, placement } = tourGeometry({ left: 100, top: 150, right: 400, bottom: 210 }, 350, 400, 1200, 900)
    expect(spotlight).toEqual({ left: 92, top: 142, width: 316, height: 76 })
    expect(placement.left).toBeGreaterThan(spotlight.left + spotlight.width)
    expect(placement.top + 400).toBeLessThanOrEqual(900)
  })
  it('clips a partially scrolled feature to the viewport', () => {
    const { spotlight } = tourGeometry({ left: -20, top: -100, right: 400, bottom: 200 }, 328, 300, 360, 800)
    expect(spotlight).toEqual({ left: 0, top: 0, width: 360, height: 208 })
  })
  it('keeps phone guidance on screen', () => {
    const { placement } = tourGeometry({ left: 16, top: 80, right: 344, bottom: 160 }, 328, 350, 360, 800)
    expect(placement.left).toBe(16)
    expect(placement.top).toBeGreaterThan(160)
    expect(placement.top + 350).toBeLessThanOrEqual(784)
  })
  it('docks opposite a large lower feature', () => {
    const { placement } = tourGeometry({ left: 0, top: 410, right: 360, bottom: 1200 }, 328, 400, 360, 800)
    expect(placement).toEqual({ left: 16, top: 16 })
  })
})
