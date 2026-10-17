import { useEffect, useId, useRef, useState } from 'react'
import { useDisplaySettings } from '../../display/displayContext.js'
import { useAnnounce } from '../ui/announcerContext.js'
import Icon from '../ui/Icon.jsx'
import TextSizeSlider from '../ui/TextSizeSlider.jsx'

const BUTTON =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-xs sm:px-3 font-bold text-accent transition-colors duration-200 ease-soft hover:bg-primary-soft aria-expanded:bg-selected aria-pressed:bg-selected'

/**
 * The strip above the header on every page (05 Shared, "Calm controls"): the skip link, then the
 * display settings one click away. Text size opens a slider; the others are toggle buttons that
 * say their state. Changes are announced without moving focus.
 *
 * On screens with a mouse it folds into a thin line until pointed at, like a hidden taskbar, and
 * opens over the header (index.css, .od-utility). It also opens whenever anything in it has
 * keyboard focus, so the skip link and every button stay reachable by Tab and to screen readers.
 * Keep open (here or Account → Display) pins it; phones and tablets always show it.
 */
export default function UtilityBar() {
  const { settings, update } = useDisplaySettings()
  const announce = useAnnounce()

  function toggle(name, on, off, label) {
    const turnOn = settings[name] !== on
    update({ [name]: turnOn ? on : off })
    announce(`${label} ${turnOn ? 'on' : 'off'}.`)
  }

  return (
    <div data-tour="display-controls" className="od-utility relative z-30 print:hidden">
      <div className="od-utility-bar border-b border-border bg-yellow-soft">
        <p aria-hidden="true" className="od-utility-hint">
          <Icon name="chevron-down" className="size-3.5" />
          Text size, contrast and more
        </p>
        {/* The text size panel is placed against this box, so it stays on screen on phones. */}
        <div className="od-utility-row relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 sm:px-6">
          {/* On phones the skip link shows only when focused, so the bar stays one line. */}
          <a
            href="#main"
            className="sr-only min-h-11 items-center text-xs font-bold text-text underline-offset-4 hover:underline focus:not-sr-only focus:inline-flex sm:not-sr-only sm:inline-flex"
          >
            Skip to main content
          </a>
          <div role="group" aria-label="Display settings" className="-mx-2 flex flex-nowrap items-center justify-end sm:mx-0 sm:flex-wrap">
            <TextSizeMenu value={settings.text} onChange={(text) => update({ text })} />
            <button
              type="button"
              aria-pressed={settings.contrast === 'high'}
              aria-label="High contrast"
              onClick={() => toggle('contrast', 'high', 'standard', 'High contrast')}
              className={BUTTON}
            >
              <Icon name="contrast" />
              {/* Shorter on phones so the three buttons stay on one line down to 320 px. */}
              <span aria-hidden="true" className="sm:hidden">Contrast</span>
              <span aria-hidden="true" className="hidden sm:inline">High contrast</span>
            </button>
            <button
              type="button"
              aria-pressed={settings.quiet}
              aria-label="Quiet mode"
              onClick={() => toggle('quiet', true, false, 'Quiet mode')}
              className={BUTTON}
            >
              <Icon name="leaf" />
              <span aria-hidden="true" className="sm:hidden">Quiet</span>
              <span aria-hidden="true" className="hidden sm:inline">Quiet mode</span>
            </button>
            <button
              type="button"
              aria-pressed={settings.menu === 'compact'}
              onClick={() => toggle('menu', 'compact', 'full', 'Compact menu')}
              // Phones always get the compact menu, so the switch is only offered on wider screens.
              className={`${BUTTON.replace('inline-flex ', '')} hidden sm:inline-flex`}
            >
              <Icon name="panel" />
              Compact menu
            </button>
            <button
              type="button"
              aria-pressed={settings.bar === 'pinned'}
              onClick={() => toggle('bar', 'pinned', 'auto', 'Keep this bar open')}
              className={`${BUTTON.replace('inline-flex ', '')} od-pointer-only`}
            >
              <Icon name="pin" />
              Keep open
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * "Text size" opens a small panel with the slider (a disclosure, not a modal): Escape or a click
 * outside closes it, and Escape puts focus back on the button. The page resizes as the slider
 * moves, so the page itself is the preview.
 */
function TextSizeMenu({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function close() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div
      ref={wrapperRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) close()
      }}
    >
      <button ref={buttonRef} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)} className={BUTTON}>
        <Icon name="type" />
        Text size<span className="sr-only">: {value}%</span>
        <Icon name="chevron-down" className={`size-3.5 transition-transform duration-300 ease-soft ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={panelId}
        data-open={open}
        inert={!open}
        aria-hidden={!open}
        className="od-pop absolute top-full right-4 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-lg border-2 border-accent bg-surface p-5 shadow-[0_18px_40px_rgba(36,27,58,0.22)] sm:right-6"
      >
        <TextSizeSlider id={`${panelId}-slider`} value={value} onChange={onChange} />
        <button
          type="button"
          onClick={close}
          className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4 hover:no-underline"
        >
          Done
        </button>
      </div>
    </div>
  )
}
