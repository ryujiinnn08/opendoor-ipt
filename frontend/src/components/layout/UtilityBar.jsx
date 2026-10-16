import { useDisplaySettings } from '../../display/displayContext.js'
import { nextTextSize, textSizeLabel } from '../../display/displaySettings.js'
import { useAnnounce } from '../ui/announcerContext.js'
import Icon from '../ui/Icon.jsx'

const BUTTON =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-xs sm:px-3 font-bold text-accent hover:bg-primary-soft aria-pressed:bg-selected'

/**
 * The strip above the header on every page (05 Shared, "Calm controls"): the skip link, then the
 * display settings one click away. Each button says its state: Text size names the current size,
 * the others are toggle buttons. Changes are announced without moving focus.
 */
export default function UtilityBar() {
  const { settings, update } = useDisplaySettings()
  const announce = useAnnounce()

  function toggle(name, on, off, label) {
    const turnOn = settings[name] !== on
    update({ [name]: turnOn ? on : off })
    announce(`${label} ${turnOn ? 'on' : 'off'}.`)
  }

  function changeTextSize() {
    const next = nextTextSize(settings.text)
    update({ text: next.value })
    announce(`Text size: ${next.label}.`)
  }

  return (
    <div className="border-b border-border bg-subtle print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 sm:px-6">
        {/* On phones the skip link shows only when focused, so the bar stays one line. */}
        <a
          href="#main"
          className="sr-only min-h-11 items-center text-xs font-bold text-text underline-offset-4 hover:underline focus:not-sr-only focus:inline-flex sm:not-sr-only sm:inline-flex"
        >
          Skip to main content
        </a>
        <div role="group" aria-label="Display settings" className="-mx-2 flex flex-wrap items-center justify-end sm:mx-0">
          <button type="button" onClick={changeTextSize} className={BUTTON}>
            <Icon name="type" />
            Text size<span className="sr-only">: {textSizeLabel(settings.text)}</span>
          </button>
          <button
            type="button"
            aria-pressed={settings.contrast === 'high'}
            onClick={() => toggle('contrast', 'high', 'standard', 'High contrast')}
            className={BUTTON}
          >
            <Icon name="contrast" />
            High contrast
          </button>
          <button type="button" aria-pressed={settings.quiet} onClick={() => toggle('quiet', true, false, 'Quiet mode')} className={BUTTON}>
            <Icon name="leaf" />
            Quiet mode
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
        </div>
      </div>
    </div>
  )
}
