import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')

// Reads the custom properties of one rule in tokens.css, e.g. ":root" or ":root[data-contrast='high']".
function variablesOf(selector) {
  const start = css.indexOf(`${selector} {`)
  const body = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/(--od-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, value]) => [name, value]))
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const standard = variablesOf(':root')
const themes = {
  standard,
  'high contrast': { ...standard, ...variablesOf(":root[data-contrast='high']") },
}

const BACKGROUNDS = ['surface-page', 'surface-canvas', 'surface-subtle', 'surface-tint']

// Text that must reach 4.5:1 (WCAG 1.4.3) on the backgrounds it sits on.
const TEXT_PAIRS = [
  ...['text-default', 'text-muted', 'brand-primary', 'text-accent'].flatMap((text) => BACKGROUNDS.map((bg) => [text, bg])),
  ['text-default', 'surface-current'],
  ['text-accent', 'surface-current'],
  ['text-on-primary', 'brand-primary'],
  ['text-on-primary', 'brand-primary-dark'],
  ['text-on-primary', 'status-danger'],
  ...['danger', 'success', 'warning', 'info'].flatMap((tone) => [
    [`status-${tone}`, `status-${tone}-bg`],
    [`status-${tone}`, 'surface-page'],
  ]),
  // Icons and numbers on the decorative tiles are drawn in the text colour.
  ...['orange', 'pink', 'sky', 'lilac'].map((accent) => ['text-default', `accent-${accent}`]),
]

// Field borders, outline buttons and the focus ring must reach 3:1 (WCAG 1.4.11). The ring is
// measured against the page colour only: a white gap always separates it from the element.
const BORDER_PAIRS = [
  ['border-input', 'surface-page'],
  ['border-input', 'surface-subtle'],
  ['border-input', 'surface-canvas'],
  ['brand-primary', 'surface-canvas'],
  ['border-focus', 'surface-page'],
  ['brand-primary', 'surface-page'],
  ['status-danger', 'surface-page'],
  // Chart marks against the card they sit on.
  ...[1, 2, 3, 4].map((n) => [`chart-${n}`, 'surface-page']),
]

describe.each(Object.entries(themes))('design tokens, %s', (_, tokens) => {
  it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (text, bg) => {
    expect(contrast(tokens[`--od-${text}`], tokens[`--od-${bg}`])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(BORDER_PAIRS)('%s against %s is at least 3:1', (border, bg) => {
    expect(contrast(tokens[`--od-${border}`], tokens[`--od-${bg}`])).toBeGreaterThanOrEqual(3)
  })
})
