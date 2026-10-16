// The Figma Button component (UI_REVAMP_PLAN §4.2): pills in Lexend SemiBold, MD 52 px and
// SM 44 px tall, so every target is at least 44 px. Button.jsx and links that look like buttons
// share these classes; a link stays a link when the action goes to another page.
export const BUTTON_BASE =
  'group inline-flex items-center justify-center gap-2 rounded-full border-2 font-display font-semibold no-underline transition-[color,background-color,border-color,box-shadow,scale] duration-200 ease-soft active:scale-[0.97]'

export const BUTTON_SIZES = {
  md: 'min-h-13 px-6 py-2.5 text-lg',
  sm: 'min-h-11 px-4 py-1.5 text-sm',
}

export const BUTTON_VARIANTS = {
  primary: 'border-primary bg-primary text-on-primary hover:border-primary-hover hover:bg-primary-hover',
  secondary: 'border-primary bg-surface text-primary hover:bg-primary-soft',
  danger: 'border-danger bg-danger text-on-primary hover:border-text hover:bg-text',
  'danger-outline': 'border-danger bg-surface text-danger hover:bg-danger-soft',
}

export function buttonClasses(variant = 'primary', size = 'md') {
  return `${BUTTON_BASE} ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]}`
}

export const PRIMARY_LINK = buttonClasses('primary')

export const SECONDARY_LINK = buttonClasses('secondary')

// A standalone text link (e.g., "Back to job postings"), at least 44 px tall to tap.
export const TEXT_LINK =
  'inline-flex min-h-11 items-center gap-1.5 font-bold text-primary underline underline-offset-4 transition-colors duration-200 ease-soft hover:text-primary-hover hover:no-underline'
