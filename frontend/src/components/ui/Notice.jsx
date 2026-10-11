import Icon from './Icon.jsx'

const TONES = {
  success: { classes: 'border-success', icon: 'check' },
  info: { classes: 'border-primary', icon: 'info' },
  error: { classes: 'border-danger', icon: 'alert' },
}

/**
 * A visible message box. It is not a live region: pair it with useAnnounce() so screen
 * readers hear the message too.
 */
export default function Notice({ tone = 'info', children, className = '' }) {
  const { classes, icon } = TONES[tone]

  return (
    <div className={`flex gap-3 rounded-md border-l-8 bg-surface p-4 ${classes} ${className}`}>
      <Icon name={icon} className="mt-0.5 size-5" />
      <div className="max-w-prose">{children}</div>
    </div>
  )
}
