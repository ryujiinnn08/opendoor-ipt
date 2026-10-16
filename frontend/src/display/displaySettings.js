// The display settings (UI_REVAMP_PLAN Q5, Q6): saved in this browser, applied as attributes on
// <html> that tokens.css and index.css read. They hold no personal data.
const KEY = 'opendoor-display'

export const TEXT_SIZES = [
  { value: 'standard', label: 'Standard' },
  { value: 'large', label: 'Large (125%)' },
  { value: 'xlarge', label: 'Extra large (150%)' },
]

export const DEFAULTS = { text: 'standard', contrast: 'standard', motion: 'allow', quiet: false, menu: 'full' }

const ALLOWED = {
  text: TEXT_SIZES.map((size) => size.value),
  contrast: ['standard', 'high'],
  motion: ['allow', 'reduce'],
  quiet: [true, false],
  menu: ['full', 'compact'],
}

/** The saved settings, with anything missing or unknown replaced by the default. */
export function readSettings() {
  let saved = {}
  try {
    saved = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') ?? {}
  } catch {
    // Private windows and blocked storage: use the defaults.
  }
  return Object.fromEntries(Object.entries(DEFAULTS).map(([name, fallback]) => [name, ALLOWED[name].includes(saved[name]) ? saved[name] : fallback]))
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Not saved, but still applied for this visit.
  }
}

/** Sets the attributes on <html>; the defaults leave no attribute behind. */
export function applySettings(settings, root = document.documentElement) {
  const attributes = {
    'data-text': settings.text === 'standard' ? null : settings.text,
    'data-contrast': settings.contrast === 'high' ? 'high' : null,
    'data-motion': settings.motion === 'reduce' ? 'reduce' : null,
    'data-quiet': settings.quiet ? '' : null,
    'data-menu': settings.menu === 'compact' ? 'compact' : null,
  }
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null) root.removeAttribute(name)
    else root.setAttribute(name, value)
  }
}

/** The next text size after `current`, going round: Standard → Large → Extra large → Standard. */
export function nextTextSize(current) {
  const index = TEXT_SIZES.findIndex((size) => size.value === current)
  return TEXT_SIZES[(index + 1) % TEXT_SIZES.length]
}

export function textSizeLabel(value) {
  return TEXT_SIZES.find((size) => size.value === value)?.label ?? 'Standard'
}
