import Icon from './Icon.jsx'

// The Figma Alert component: a tinted box with a border, an icon and the text.
const TONES = {
  success: { box: 'border-success bg-success-soft', ink: 'text-success', icon: 'check' },
  info: { box: 'border-accent bg-info-soft', ink: 'text-accent', icon: 'info' },
  warning: { box: 'border-warning bg-warning-soft', ink: 'text-warning', icon: 'alert' },
  error: { box: 'border-danger bg-danger-soft', ink: 'text-danger', icon: 'alert' },
}

/**
 * A visible message box. It is not a live region: pair it with useAnnounce() so screen
 * readers hear the message too. An optional `title` is shown in bold in the tone's colour.
 */
export default function Notice({ tone = 'info', title, children, className = '' }) {
  const { box, ink, icon } = TONES[tone] ?? TONES.info

  return (
    <div className={`flex animate-reveal gap-3 rounded-lg border-2 p-4 text-text ${box} ${className}`}>
      <Icon name={icon} className={`mt-0.5 size-6 ${ink}`} />
      <div className="min-w-0 max-w-prose">
        {title && <p className={`font-bold ${ink}`}>{title}</p>}
        {children}
      </div>
    </div>
  )
}
