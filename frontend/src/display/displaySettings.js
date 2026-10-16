// The display settings (UI_REVAMP_PLAN Q5, Q6): saved in this browser and applied on <html>,
// where tokens.css and index.css read them. They hold no personal data.
const KEY = 'opendoor-display'

// Text size is a percentage of the browser's own size: 100 % up to 200 % (WCAG 1.4.4), in 5 %
// steps. The design's three sizes are quick picks on the slider.
export const TEXT_MIN = 100
export const TEXT_MAX = 200
export const TEXT_STEP = 5

export const TEXT_PRESETS = [
  { value: 100, label: 'Standard' },
  { value: 125, label: 'Large' },
  { value: 150, label: 'Extra large' },
]

// Settings saved before the slider (Phase 7 R2) used names.
const OLD_TEXT_SIZES = { standard: 100, large: 125, xlarge: 150 }

// `bar`: the display settings bar hides until pointed at (`auto`, on mouse screens only) or always
// shows (`pinned`).
export const DEFAULTS = { text: TEXT_MIN, contrast: 'standard', motion: 'allow', quiet: false, menu: 'full', bar: 'auto' }

const ALLOWED = {
  contrast: ['standard', 'high'],
  motion: ['allow', 'reduce'],
  quiet: [true, false],
  menu: ['full', 'compact'],
  bar: ['auto', 'pinned'],
}

/** A saved text size as a whole percentage in range, or null if it isn't one. */
export function cleanTextSize(value) {
  const number = OLD_TEXT_SIZES[value] ?? value
  if (typeof number !== 'number' || !Number.isFinite(number)) return null
  const stepped = Math.round(number / TEXT_STEP) * TEXT_STEP
  return Math.min(TEXT_MAX, Math.max(TEXT_MIN, stepped))
}

/** The saved settings, with anything missing or unknown replaced by the default. */
export function readSettings() {
  let saved = {}
  try {
    saved = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') ?? {}
  } catch {
    // Private windows and blocked storage: use the defaults.
  }
  const settings = { text: cleanTextSize(saved.text) ?? DEFAULTS.text }
  for (const [name, values] of Object.entries(ALLOWED)) {
    settings[name] = values.includes(saved[name]) ? saved[name] : DEFAULTS[name]
  }
  return settings
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Not saved, but still applied for this visit.
  }
}

/** Applies the settings on <html>; the defaults leave nothing behind. */
export function applySettings(settings, root = document.documentElement) {
  if (settings.text === TEXT_MIN) root.style.removeProperty('--od-font-size')
  else root.style.setProperty('--od-font-size', `${settings.text}%`)

  const attributes = {
    'data-contrast': settings.contrast === 'high' ? 'high' : null,
    'data-motion': settings.motion === 'reduce' ? 'reduce' : null,
    'data-quiet': settings.quiet ? '' : null,
    'data-menu': settings.menu === 'compact' ? 'compact' : null,
    'data-bar': settings.bar === 'pinned' ? 'pinned' : null,
  }
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null) root.removeAttribute(name)
    else root.setAttribute(name, value)
  }
  if (!root.getAttribute('style')) root.removeAttribute('style')
}

/** "125%", or "125%, Large" when it is one of the design's sizes. */
export function textSizeLabel(value) {
  const preset = TEXT_PRESETS.find((size) => size.value === value)
  return preset ? `${value}%, ${preset.label}` : `${value}%`
}
