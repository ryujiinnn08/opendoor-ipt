import { beforeEach, describe, expect, it } from 'vitest'
import { applySettings, DEFAULTS, nextTextSize, readSettings, saveSettings } from './displaySettings.js'

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
    const settings = { text: 'xlarge', contrast: 'high', motion: 'reduce', quiet: true, menu: 'compact' }
    saveSettings(settings)
    expect(readSettings()).toEqual(settings)
  })

  it('sets the attributes on <html> and removes them for the defaults', () => {
    const root = document.createElement('html')
    applySettings({ text: 'large', contrast: 'high', motion: 'reduce', quiet: true, menu: 'compact' }, root)
    expect(root.getAttribute('data-text')).toBe('large')
    expect(root.getAttribute('data-contrast')).toBe('high')
    expect(root.getAttribute('data-motion')).toBe('reduce')
    expect(root.hasAttribute('data-quiet')).toBe(true)
    expect(root.getAttribute('data-menu')).toBe('compact')

    applySettings(DEFAULTS, root)
    expect(root.attributes).toHaveLength(0)
  })

  it('goes round the text sizes', () => {
    expect(nextTextSize('standard').value).toBe('large')
    expect(nextTextSize('large').value).toBe('xlarge')
    expect(nextTextSize('xlarge').value).toBe('standard')
  })
})
