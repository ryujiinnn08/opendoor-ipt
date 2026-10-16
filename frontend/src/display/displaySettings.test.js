import { beforeEach, describe, expect, it } from 'vitest'
import { applySettings, cleanTextSize, DEFAULTS, readSettings, saveSettings, textSizeLabel } from './displaySettings.js'

describe('display settings', () => {
  beforeEach(() => window.localStorage.clear())

  it('starts from the defaults and keeps only known values', () => {
    expect(readSettings()).toEqual(DEFAULTS)

    window.localStorage.setItem('opendoor-display', JSON.stringify({ text: 'huge', contrast: 'high', quiet: 'yes' }))
    expect(readSettings()).toEqual({ ...DEFAULTS, contrast: 'high' })
  })

  it('survives broken saved data', () => {
    window.localStorage.setItem('opendoor-display', '{not json')
    expect(readSettings()).toEqual(DEFAULTS)
  })

  it('saves and reads back', () => {
    const settings = { text: 135, contrast: 'high', motion: 'reduce', quiet: true, menu: 'compact', bar: 'pinned' }
    saveSettings(settings)
    expect(readSettings()).toEqual(settings)
  })

  it('keeps text sizes between 100% and 200% in 5% steps, and reads the old named sizes', () => {
    expect(cleanTextSize(50)).toBe(100)
    expect(cleanTextSize(260)).toBe(200)
    expect(cleanTextSize(127)).toBe(125)
    expect(cleanTextSize('large')).toBe(125)
    expect(cleanTextSize('xlarge')).toBe(150)
    expect(cleanTextSize('huge')).toBeNull()
  })

  it('sets the text size and the attributes on <html>, and removes them for the defaults', () => {
    const root = document.createElement('html')
    applySettings({ text: 140, contrast: 'high', motion: 'reduce', quiet: true, menu: 'compact', bar: 'pinned' }, root)
    expect(root.style.getPropertyValue('--od-font-size')).toBe('140%')
    expect(root.getAttribute('data-contrast')).toBe('high')
    expect(root.getAttribute('data-motion')).toBe('reduce')
    expect(root.hasAttribute('data-quiet')).toBe(true)
    expect(root.getAttribute('data-menu')).toBe('compact')
    expect(root.getAttribute('data-bar')).toBe('pinned')

    applySettings(DEFAULTS, root)
    expect(root.attributes).toHaveLength(0)
  })

  it('names the design’s sizes', () => {
    expect(textSizeLabel(125)).toBe('125%, Large')
    expect(textSizeLabel(135)).toBe('135%')
  })
})
