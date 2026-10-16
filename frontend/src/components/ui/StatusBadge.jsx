import Icon from './Icon.jsx'

// The Figma Badge component: a small pill with a thin border, so it never looks like a (thicker,
// taller) button. Each tone has its own icon, so a status is never colour alone.
const TONES = {
  success: { classes: 'border-success bg-success-soft text-success', icon: 'check' },
  danger: { classes: 'border-danger bg-danger-soft text-danger', icon: 'cross' },
  warning: { classes: 'border-warning bg-warning-soft text-warning', icon: 'alert' },
  info: { classes: 'border-accent bg-primary-soft text-accent', icon: 'circle' },
  neutral: { classes: 'border-muted bg-subtle text-muted', icon: 'minus' },
}

/**
 * Status shown with an icon and a word, never colour alone (WCAG 1.4.1). `icon` overrides the
 * tone's icon, e.g., a pencil for drafts.
 */
export default function StatusBadge({ tone = 'info', icon, children }) {
  const { classes, icon: toneIcon } = TONES[tone] ?? TONES.info

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${classes}`}>
      <Icon name={icon ?? toneIcon} className="size-3.5" />
      {children}
    </span>
  )
}
