import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDisplaySettings } from '../../display/displayContext.js'
import { ArrowPill } from '../ui/Button.jsx'
import { buttonClasses } from '../ui/buttonLinkStyles.js'
import Icon from '../ui/Icon.jsx'
import BrandLink from './BrandLink.jsx'
import { isCurrent } from './portalMenus.js'

const NAV_ITEM =
  'inline-flex min-h-11 items-center gap-2 whitespace-nowrap px-3 text-base transition-[box-shadow,color] duration-300 ease-soft'
// The current page is underlined in violet (LinkedIn's top bar), not a tinted pill.
const NAV_IDLE = 'text-muted hover:text-text hover:shadow-[inset_0_-3px_0_var(--od-accent-yellow)]'
const NAV_CURRENT = 'font-bold text-text shadow-[inset_0_-3px_0_var(--od-brand-primary)]'
const GAP = 24

/**
 * The header on every page (UI_FEEDBACK_PLAN §3.1–3.2): the logo on the left, the role's links
 * after it, and the person's own on the right (Notifications and one account menu). It becomes
 * the logo and one Menu button when the Compact menu setting is on, or when the links don't fit
 * on one line (phones, large text).
 *
 * Entries are links { to, label, icon, end?, match?, count?, cta? }, buttons
 * { onClick, label, icon, loading?, loadingText? }, or the account menu
 * { menu: true, label, avatar, avatarSrc?, avatarFit?, name, email, items, logout }.
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
      const needed = [...copy.children].reduce((sum, part) => sum + part.offsetWidth, 0) + 2 * GAP
      setTooNarrow(row.clientWidth > 0 && needed > row.clientWidth)
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(row)
    observer.observe(copy)
    // Resize observers wait for the next frame, which a page in a background tab never paints;
    // the window's own resize event keeps the header right when the tab comes back.
    window.addEventListener('resize', check)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [canMeasure])

  const compact = settings.menu === 'compact' || tooNarrow
  // In the compact Menu the account menu's links are part of the one list, so nothing takes two clicks.
  const flat = [...left, ...right.flatMap((entry) => (entry.menu ? [...entry.items, entry.logout] : [entry]))]

  return (
    <header data-tour="site-navigation" className="relative z-20 border-b-[3px] border-yellow bg-surface print:hidden">
      <div ref={rowRef} className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
        {compact ? (
          <CompactRow key="compact" homeTo={homeTo} entries={flat} pathname={pathname} />
        ) : (
          <div key="full" className="flex animate-fade-in items-center gap-6">
            <BrandLink to={homeTo} />
            <nav aria-label="Main">
              <EntryList entries={left} pathname={pathname} />
            </nav>
            <nav aria-label="Account" className="ml-auto">
              <EntryList entries={right} pathname={pathname} />
            </nav>
          </div>
        )}
      </div>

      {canMeasure && (
        <div aria-hidden="true" className="pointer-events-none invisible absolute top-0 left-0 h-0 overflow-hidden">
          <div ref={measureRef} className="flex w-max items-center">
            <span className="inline-flex items-center gap-2 font-display text-[1.25rem] font-semibold">
              <span className="h-9 w-7" />
              OpenDoor
            </span>
            <EntryList entries={left} pathname={pathname} measuring />
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

  if (entry.menu) {
    if (measuring) return <span className={`${NAV_ITEM} ${NAV_IDLE}`}>{content}<Icon name="chevron-down" className="size-4" /></span>
    return <AccountMenu entry={entry} />
  }

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
    <Link data-tour={`nav-${entry.to}`} to={entry.to} aria-current={current ? 'page' : undefined} className={look}>
      {content}
    </Link>
  )
}

function EntryContent({ entry }) {
  return (
    <>
      {entry.avatar ? <Avatar initials={entry.avatar} src={entry.avatarSrc} fit={entry.avatarFit} /> : entry.icon && <Icon name={entry.icon} className={entry.onClick ? 'size-4' : 'size-5'} />}
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

/** The person's photo (job seekers), their company logo (employers) or initials, beside Account (decoration). */
function Avatar({ initials, src, fit = 'cover' }) {
  // A logo that fails to load (deleted, offline) falls back to the initials.
  const [failed, setFailed] = useState(null)
  if (src && failed !== src) {
    const look = fit === 'contain' ? 'border border-border bg-white object-contain p-0.5' : 'object-cover'
    return <img src={src} alt="" onError={() => setFailed(src)} className={`size-8 shrink-0 rounded-full ${look}`} />
  }
  return (
    <span aria-hidden="true" className="inline-grid size-8 shrink-0 place-items-center rounded-full bg-yellow text-xs font-bold text-text">
      {initials}
    </span>
  )
}

/**
 * The account menu (UI_FEEDBACK_PLAN §3.2): the initials open, in one click, a panel with the
 * person's name and email, their own pages, and Log out. A disclosure (button + list of links),
 * not an ARIA menu, so links work as links. Escape and a click outside close it; Escape puts
 * focus back on the button. A new page closes it.
 */
function AccountMenu({ entry }) {
  const { pathname } = useLocation()
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === pathname
  const panelId = useId()
  const buttonRef = useRef(null)
  const wrapperRef = useRef(null)
  const ITEM = 'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left transition-colors duration-200 ease-soft'

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

  const current = entry.items.some((item) => isCurrent(item, pathname))

  return (
    <div ref={wrapperRef} onKeyDown={onKeyDown} className="relative">
      <button
        ref={buttonRef}
        data-tour="account-menu"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenOn(open ? null : pathname)}
        className={`${NAV_ITEM} ${current ? NAV_CURRENT : NAV_IDLE}`}
      >
        <Avatar initials={entry.avatar} src={entry.avatarSrc} fit={entry.avatarFit} />
        <span>{entry.label}</span>
        <Icon name="chevron-down" className={`size-4 transition-transform duration-200 ease-soft ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={panelId}
        data-open={open}
        inert={!open}
        aria-hidden={!open}
        className="od-pop absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-2 shadow-[0_12px_28px_rgba(36,27,58,0.16)]"
      >
        <div className="flex items-center gap-3 border-b border-border px-3 pt-2 pb-3">
          <Avatar initials={entry.avatar} src={entry.avatarSrc} fit={entry.avatarFit} />
          <div className="min-w-0">
            <p className="font-bold">{entry.name}</p>
            {entry.email && <p className="text-sm break-all text-muted">{entry.email}</p>}
          </div>
        </div>
        <ul className="mt-2 grid gap-0.5">
          {entry.items.map((item) => {
            const here = isCurrent(item, pathname)
            return (
              <li key={item.label}>
                <Link
                  data-tour={`nav-${item.to}`}
                  to={item.to}
                  aria-current={here ? 'page' : undefined}
                  className={`${ITEM} ${here ? 'bg-selected font-bold text-accent' : 'text-text hover:bg-primary-soft'}`}
                >
                  <Icon name={item.icon} className="size-5 text-accent" />
                  {item.label}
                </Link>
              </li>
            )
          })}
          <li className="mt-1 border-t border-border pt-1">
            <LogOutButton entry={entry.logout} className={`${ITEM} font-bold text-primary hover:bg-primary-soft`} />
          </li>
        </ul>
      </div>
    </div>
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
  const ITEM = 'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left transition-colors duration-200 ease-soft'

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
    <div className="flex animate-fade-in items-center justify-between gap-4">
      <BrandLink to={homeTo} />
      <nav aria-label="Main" ref={wrapperRef} onKeyDown={onKeyDown} className="relative">
        <button
          ref={buttonRef}
          data-tour="compact-menu"
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className={buttonClasses('secondary', 'sm')}
        >
          <span aria-hidden="true" className="relative size-5">
            <Icon
              name="menu"
              className={`absolute inset-0 size-5 transition-[opacity,rotate] duration-300 ease-soft ${open ? 'rotate-90 opacity-0' : 'opacity-100'}`}
            />
            <Icon
              name="cross"
              className={`absolute inset-0 size-5 transition-[opacity,rotate] duration-300 ease-soft ${open ? 'opacity-100' : '-rotate-90 opacity-0'}`}
            />
          </span>
          Menu
        </button>
        <ul
          id={panelId}
          data-open={open}
          inert={!open}
          aria-hidden={!open}
          className="od-pop absolute right-0 z-30 mt-2 grid w-[min(30rem,calc(100vw-2rem))] gap-1 rounded-lg border-2 border-accent bg-surface p-3 shadow-[0_16px_32px_rgba(36,27,58,0.2)] sm:grid-cols-2"
        >
          {entries.map((entry, index) => {
            const current = Boolean(entry.to) && isCurrent(entry, pathname)
            const item = (
              <>
                <Icon name={entry.icon} className="size-5 text-accent" />
                <EntryContent entry={{ ...entry, icon: undefined, onClick: undefined, avatar: undefined }} />
              </>
            )
            return (
              <li key={entry.label} className="od-stagger" style={{ '--i': index }}>
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
