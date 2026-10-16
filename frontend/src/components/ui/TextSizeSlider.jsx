import { useRef, useState } from 'react'
import { useAnnounce } from './announcerContext.js'
import { TEXT_MAX, TEXT_MIN, TEXT_PRESETS, TEXT_STEP, textSizeLabel } from '../../display/displaySettings.js'

const STEP_BUTTON =
  'grid size-11 shrink-0 place-items-center rounded-full border-2 border-input bg-surface font-display font-semibold text-accent transition-[background-color,scale] duration-200 ease-soft hover:bg-primary-soft active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'

// The preview's size in pixels for the base 18 px body text, so it shows the chosen size without
// resizing the page (and the slider) while the thumb is still being dragged.
const BODY_PX = 18

/**
 * Choose the text size on a slider from 100 % to 200 %, with Smaller and Larger buttons for
 * people who find dragging hard, and the design's three sizes as quick picks.
 *
 * While the thumb is dragged, only the preview line and the number change; the page takes the new
 * size when the thumb is let go. Resizing the page under the pointer would also resize the slider,
 * so the thumb would run away from the finger. Keys, buttons and quick picks apply at once.
 */
export default function TextSizeSlider({ id, value, onChange }) {
  const announce = useAnnounce()
  const [draft, setDraft] = useState(null)
  const dragging = useRef(false)
  const shown = draft ?? value
  const fill = ((shown - TEXT_MIN) / (TEXT_MAX - TEXT_MIN)) * 100

  function choose(next) {
    const clamped = Math.min(TEXT_MAX, Math.max(TEXT_MIN, next))
    setDraft(null)
    onChange(clamped)
    announce(`Text size ${textSizeLabel(clamped)}.`)
  }

  function commitDrag() {
    if (!dragging.current) return
    dragging.current = false
    if (draft !== null && draft !== value) onChange(draft)
    setDraft(null)
  }

  function handleChange(event) {
    const next = Number(event.target.value)
    if (dragging.current) setDraft(next)
    else onChange(next)
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-display text-lg font-semibold">
          Text size
        </label>
        <output htmlFor={id} className="font-display text-2xl font-bold text-accent tabular-nums">
          {shown}%
        </output>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => choose(value - TEXT_STEP)} disabled={value <= TEXT_MIN} aria-label="Smaller text" className={STEP_BUTTON}>
          <span aria-hidden="true" className="text-sm">
            A
          </span>
        </button>
        <input
          id={id}
          type="range"
          min={TEXT_MIN}
          max={TEXT_MAX}
          step={TEXT_STEP}
          value={shown}
          aria-valuetext={textSizeLabel(shown)}
          onPointerDown={() => {
            dragging.current = true
          }}
          onPointerUp={commitDrag}
          onPointerCancel={commitDrag}
          onLostPointerCapture={commitDrag}
          onBlur={commitDrag}
          onChange={handleChange}
          style={{ '--fill': `${fill}%` }}
          className="od-range min-w-0 flex-1"
        />
        <button type="button" onClick={() => choose(value + TEXT_STEP)} disabled={value >= TEXT_MAX} aria-label="Larger text" className={STEP_BUTTON}>
          <span aria-hidden="true" className="text-xl">
            A
          </span>
        </button>
      </div>

      {/* A sample at the chosen size, drawn in pixels so it never moves the slider. */}
      <p
        aria-hidden="true"
        className="mt-3 h-16 overflow-hidden rounded-md bg-subtle px-3 leading-[4rem] whitespace-nowrap text-ellipsis text-text"
        style={{ fontSize: `${(BODY_PX * shown) / 100}px` }}
      >
        Find work that fits you
      </p>

      <div role="group" aria-label="Quick sizes" className="mt-3 flex flex-wrap gap-2">
        {TEXT_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            aria-pressed={value === preset.value}
            onClick={() => choose(preset.value)}
            className="inline-flex min-h-11 items-center rounded-full border-2 border-input px-4 text-sm font-bold text-text transition-colors duration-200 ease-soft hover:bg-primary-soft aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-on-primary"
          >
            {preset.label} ({preset.value}%)
          </button>
        ))}
      </div>
    </div>
  )
}
