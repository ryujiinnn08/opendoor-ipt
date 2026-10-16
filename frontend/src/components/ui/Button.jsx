import { buttonClasses, TEXT_LINK } from './buttonLinkStyles.js'
import Icon from './Icon.jsx'

/**
 * The button: variant primary, secondary, danger, danger-outline or link; size md
 * or sm; an optional `icon` before the label. `arrow` adds the orange arrow pill (decoration:
 * hidden from screen readers and in Quiet mode), for the one main call to action on a page.
 *
 * While `loading`, the button keeps focus and its label changes (e.g., "Saving…"), so the state
 * is never conveyed by a silently disabled button.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  arrow = false,
  type = 'button',
  loading = false,
  loadingText = 'Please wait…',
  className = '',
  children,
  onClick,
  ...props
}) {
  const look = variant === 'link' ? `${TEXT_LINK} px-1` : buttonClasses(variant, size)

  return (
    <button
      type={type}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      className={`${look} ${loading ? 'cursor-progress opacity-80' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        loadingText
      ) : (
        <>
          {icon && <Icon name={icon} className={size === 'sm' ? 'size-4' : 'size-5'} />}
          {children}
          {arrow && <ArrowPill />}
        </>
      )}
    </button>
  )
}

/** The orange circle with an arrow from the design (decoration only). */
export function ArrowPill() {
  return (
    <span aria-hidden="true" className="od-decoration -mr-2 inline-grid size-7 shrink-0 place-items-center rounded-full bg-orange text-text transition-transform duration-300 ease-soft group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
      <Icon name="arrow-up-right" className="size-4" />
    </span>
  )
}
