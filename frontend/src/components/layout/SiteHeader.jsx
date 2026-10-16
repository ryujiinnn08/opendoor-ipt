import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDisplaySettings } from '../../display/displayContext.js'
import { ArrowPill } from '../ui/Button.jsx'
import { buttonClasses } from '../ui/buttonLinkStyles.js'
import Icon from '../ui/Icon.jsx'
import BrandLink from './BrandLink.jsx'
import { isCurrent } from './portalMenus.js'

const NAV_ITEM = 'inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border-2 px-3.5 text-lg'
const NAV_IDLE = 'border-transparent text-text hover:bg-primary-soft'
const NAV_CURRENT = 'border-primary bg-selected font-bold text-accent'
const GAP = 24

/**
 * The header on every page (05 Shared, "A calm top menu"): the role's links left of the centred
 * logo, the person's own links right of it. It becomes the logo and one Menu button when the
 * Compact menu setting is on, or when the links don't fit on one line (phones, large text).
 *
 * Entries are links { to, label, icon, end?, match?, count?, avatar?, cta? } or buttons
 * { onClick, label, icon, loading?, loadingText? }.
 */
export default function SiteHeader({ homeTo = '/', left, right }) {
  const { settings } = useDisplaySettings()
  const { pathname } = useLocation()
  const rowRef = useRef(null)
  const measureRef = useRef(null)
  const [tooNarrow, setTooNarrow] = useState(false)
  const canMeasure = typeof ResizeObserver !== 'undefined'

  // Measure an invisible copy of the full row at its natural width, and compare it with the room
  // there is. A copy, because the real row is gone while compact. Before paint, so no flash.
  useLayoutEffect(() => {
    if (!canMeasure) return
    const row = rowRef.current
    const copy = measureRef.current
    function check() {
      const [leftPart, logo, rightPart] = copy.children
      const needed = 2 * Math.max(leftPart.offsetWidth, rightPart.offsetWidth) + logo.offsetWidth + 2 * GAP
      setTooNarrow(row.clientWidth > 0 && needed > row.clientWidth)
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(row)
    observer.observe(copy)
    return () => observer.disconnect()
  }, [canMeasure])

  const compact = settings.menu === 'compact' || tooNarrow

  return (
    <header className="relative border-b border-border bg-surface print:hidden">
      <div ref={rowRef} className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        {compact ? (
          <CompactRow homeTo={homeTo} entries={[...left, ...right]} pathname={pathname} />
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
            <nav aria-label="Main" className="justify-self-start">
              <EntryList entries={left} pathname={pathname} />
            </nav>
            <BrandLink to={homeTo} />
            <nav aria-label="Account" className="justify-self-end">
              <EntryList entries={right} pathname={pathname} />
            </nav>
          </div>
        )}
      </div>

      {canMeasure && (
        <div aria-hidden="true" className="pointer-events-none invisible absolute top-0 left-0 h-0 overflow-hidden">
          <div ref={measureRef} className="flex w-max items-center">
            <EntryList entries={left} pathname={pathname} measuring />
            <span className="inline-flex items-center gap-2.5 font-display text-[1.625rem] font-semibold">
              <span className="size-9" />
              OpenDoor
            </span>
            <EntryList entries={right} pathname={pathname} measuring />
          </div>
        </div>
      )}
    </header>
  )
}

function EntryList({ entries, pathname, measuring = false }) {
  return (
    <ul className="flex items-center gap-1.5">
      {entries.map((entry) => (
        <li key={entry.label}>
          <Entry entry={entry} current={Boolean(entry.to) && isCurrent(entry, pathname)} measuring={measuring} />
        </li>
      ))}
    </ul>
  )
}

/** One entry of the full header. While `measuring`, a plain copy with nothing to focus. */
function Entry({ entry, current, measuring }) {
  const content = <EntryContent entry={entry} />

  if (entry.onClick || entry.cta) {
    const look = `${buttonClasses('secondary', 'sm')} ml-2 whitespace-nowrap`
    if (measuring) return <span className={look}>{content}</span>
    if (entry.cta) {
      return (
        <Link to={entry.to} className={look}>
          {entry.label}
          <ArrowPill />
        </Link>
      )
    }
    return <LogOutButton entry={entry} className={look} />
  }

  const look = `${NAV_ITEM} ${current ? NAV_CURRENT : NAV_IDLE}`
  if (measuring) return <span className={look}>{content}</span>
  return (
    <Link to={entry.to} aria-current={current ? 'page' : undefined} className={look}>
      {content}
    </Link>
  )
}

function EntryContent({ entry }) {
  return (
    <>
      {entry.onClick && <Icon name={entry.icon} className="size-4" />}
      {entry.avatar && <Avatar initials={entry.avatar} />}
      {/* One span, so the space before the count survives inside the flex link. Screen readers
          hear "Notifications (2 unread)"; the red pill shows the number. */}
      <span>
        {entry.label}
        {entry.count > 0 && (
          <>
            {' '}
            <span className="sr-only">({entry.count} unread)</span>
            <span
              aria-hidden="true"
              className="ml-0.5 inline-grid min-w-6 place-items-center rounded-full bg-danger px-1.5 text-xs font-bold text-on-primary"
            >
              {entry.count}
            </span>
          </>
        )}
      </span>
    </>
  )
}

function Avatar({ initials }) {
  return (
    <span aria-hidden="true" className="inline-grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-accent">
      {initials}
    </span>
  )
}

function LogOutButton({ entry, className }) {
  return (
    <button
      type="button"
      onClick={entry.loading ? undefined : entry.onClick}
      aria-disabled={entry.loading || undefined}
      aria-busy={entry.loading || undefined}
      className={className}
    >
      {entry.loading ? (
        entry.loadingText
      ) : (
        <>
          <Icon name={entry.icon} className="size-4" />
          {entry.label}
        </>
      )}
    </button>
  )
}

/**
 * The logo and a Menu button that opens a short list with icons (05 Shared, "Menu open").
 * Escape and a click outside close it; Escape puts focus back on the button.
 */
function CompactRow({ homeTo, entries, pathname }) {
  // Open on the page where it was opened: a new page closes it, without an effect.
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === pathname
  const setOpen = (value) => setOpenOn(value ? pathname : null)
  const panelId = useId()
  const buttonRef = useRef(null)
  const wrapperRef = useRef(null)
  const ITEM = 'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left'

  useEffect(() => {
    if (!open) return
    function onPointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpenOn(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function onKeyDown(event) {
    if (event.key === 'Escape' && open) {
      setOpenOn(null)
      buttonRef.current?.focus()
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <BrandLink to={homeTo} />
      <nav aria-label="Main" ref={wrapperRef} onKeyDown={onKeyDown} className="relative">
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className={buttonClasses('secondary', 'sm')}
        >
          <Icon name={open ? 'cross' : 'menu'} className="size-5" />
          Menu
        </button>
        <ul
          id={panelId}
          hidden={!open}
          className="absolute right-0 z-30 mt-2 grid w-[min(30rem,calc(100vw-2rem))] gap-1 rounded-lg border-2 border-accent bg-surface p-3 shadow-[0_16px_32px_rgba(36,27,58,0.2)] sm:grid-cols-2"
        >
          {entries.map((entry) => {
            const current = Boolean(entry.to) && isCurrent(entry, pathname)
            const item = (
              <>
                <Icon name={entry.icon} className="size-5 text-accent" />
                <EntryContent entry={{ ...entry, icon: undefined, onClick: undefined, avatar: undefined }} />
              </>
            )
            return (
              <li key={entry.label}>
                {entry.onClick ? (
                  <LogOutButton entry={entry} className={`${ITEM} font-bold text-primary hover:bg-primary-soft`} />
                ) : (
                  <Link
                    to={entry.to}
                    aria-current={current ? 'page' : undefined}
                    className={`${ITEM} ${current ? 'bg-selected font-bold text-accent' : 'text-text hover:bg-primary-soft'}`}
                  >
                    {item}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
