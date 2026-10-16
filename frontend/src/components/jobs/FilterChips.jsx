import { useEffect, useId, useRef, useState } from 'react'
import { EMPLOYMENT_TYPES, WORK_SETUPS } from '../../lib/postingOptions.js'
import AccommodationPicker from '../postings/AccommodationPicker.jsx'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import Modal, { ModalClose } from '../ui/Modal.jsx'

const CHIP =
  'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 font-display text-sm font-semibold transition-colors duration-200 ease-soft'
const CHIP_IDLE = 'border-input bg-surface text-text hover:bg-primary-soft'
const CHIP_ON = 'border-primary bg-primary text-on-primary hover:bg-primary-hover'
const OPTION = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-primary-soft'

/** "Remote", "Remote +1": what a chip shows once something is chosen. */
function chosenText(labels) {
  if (labels.length === 0) return null
  return labels.length === 1 ? labels[0] : `${labels[0]} +${labels.length - 1}`
}

/**
 * The job list's filters as a row of chips (UI_FEEDBACK_PLAN §3.3, LinkedIn's job search). Each
 * chip names what is picked ("Remote +1") instead of a count, and opens a small panel; changes
 * apply at once, as before. Accommodations open a dialog, since there are many. Screen readers
 * hear the filter's name before the value ("Work setup: Remote +1").
 */
export default function FilterChips({ filters, onChange, onClear, categories, groups, sorts, matchMode, activeCount, listsError = false }) {
  const [accommodationsOpen, setAccommodationsOpen] = useState(false)
  const toggle = (list, value, on) => (on ? [...list, value] : list.filter((item) => item !== value))
  const labelsOf = (options, values) => options.filter((option) => values.includes(option.value)).map((option) => option.label)
  const category = categories.find((item) => String(item.id) === filters.category)
  const sort = sorts.find((option) => option.value === filters.sort) ?? sorts[0]
  const accommodationCount = filters.accommodations.length

  return (
    <section aria-labelledby="job-filters-heading" className="mt-6">
      <h2 id="job-filters-heading" className="sr-only">
        Filters
      </h2>
      {listsError && <p className="mb-3 text-muted">We couldn&apos;t load the filters. Reload the page to try again.</p>}
      <ul className="flex flex-wrap items-center gap-2">
        {matchMode && (
          <li>
            <button
              type="button"
              aria-pressed={filters.show === 'matches'}
              onClick={() => onChange({ show: filters.show === 'matches' ? 'all' : 'matches' })}
              className={`${CHIP} ${filters.show === 'matches' ? CHIP_ON : CHIP_IDLE}`}
            >
              {filters.show === 'matches' && <Icon name="check" className="size-4" />}
              Matches my needs
            </button>
          </li>
        )}

        <ChipPanel name="Work setup" chosen={chosenText(labelsOf(WORK_SETUPS, filters.workSetup))}>
          {WORK_SETUPS.map((option) => (
            <label key={option.value} className={OPTION}>
              <input
                type="checkbox"
                checked={filters.workSetup.includes(option.value)}
                onChange={(event) => onChange({ workSetup: toggle(filters.workSetup, option.value, event.target.checked) })}
                className="size-5 accent-primary"
              />
              {option.label}
            </label>
          ))}
        </ChipPanel>

        <ChipPanel name="Employment type" chosen={chosenText(labelsOf(EMPLOYMENT_TYPES, filters.employmentType))}>
          {EMPLOYMENT_TYPES.map((option) => (
            <label key={option.value} className={OPTION}>
              <input
                type="checkbox"
                checked={filters.employmentType.includes(option.value)}
                onChange={(event) => onChange({ employmentType: toggle(filters.employmentType, option.value, event.target.checked) })}
                className="size-5 accent-primary"
              />
              {option.label}
            </label>
          ))}
        </ChipPanel>

        <ChipPanel name="Category" chosen={category?.name ?? null} wide>
          {[{ id: '', name: 'Any category' }, ...categories].map((item) => (
            <label key={item.id} className={OPTION}>
              <input
                type="radio"
                name="filter-category"
                checked={filters.category === String(item.id)}
                onChange={() => onChange({ category: String(item.id) })}
                className="size-5 accent-primary"
              />
              {item.name}
            </label>
          ))}
        </ChipPanel>

        <li>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setAccommodationsOpen(true)}
            className={`${CHIP} ${accommodationCount > 0 ? CHIP_ON : CHIP_IDLE}`}
          >
            <Icon name="sliders" className="size-4" />
            {accommodationCount > 0 ? (
              <span>
                <span className="sr-only">Accommodations:</span> {accommodationCount === 1 ? '1 accommodation' : `${accommodationCount} accommodations`}
              </span>
            ) : (
              'Accommodations'
            )}
          </button>
        </li>

        <ChipPanel name="Sort" chosen={sort.label} showName quiet>
          {sorts.map((option) => (
            <label key={option.value} className={OPTION}>
              <input
                type="radio"
                name="filter-sort"
                checked={filters.sort === option.value}
                onChange={() => onChange({ sort: option.value })}
                className="size-5 accent-primary"
              />
              {option.label}
            </label>
          ))}
        </ChipPanel>

        {activeCount > 0 && (
          <li>
            <Button variant="link" onClick={onClear}>
              Clear all filters
            </Button>
          </li>
        )}
      </ul>

      <Modal
        open={accommodationsOpen}
        onOpenChange={setAccommodationsOpen}
        title="Accommodations provided"
        description="Show jobs that provide every one you tick. The list updates as you tick."
      >
        <AccommodationPicker
          id="filter-accommodations"
          legend="Accommodations"
          groups={groups}
          value={filters.accommodations.map((id) => ({ id, note: '' }))}
          onChange={(value) => onChange({ accommodations: value.map((item) => item.id) })}
          withNotes={false}
        />
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {accommodationCount > 0 && (
            <Button variant="secondary" onClick={() => onChange({ accommodations: [] })}>
              Untick all
            </Button>
          )}
          <ModalClose asChild>
            <Button>Show jobs</Button>
          </ModalClose>
        </div>
      </Modal>
    </section>
  )
}

/**
 * One chip that opens a small panel of choices below it (a disclosure: button + group of
 * inputs). Escape and a click outside close it; Escape puts focus back on the chip. With
 * `showName`, the name stays visible ("Sort: Newest"); otherwise a chosen value replaces it.
 */
function ChipPanel({ name, chosen, showName = false, quiet = false, wide = false, children }) {
  const [open, setOpen] = useState(false)
  // A chip near the right edge opens its panel leftwards, so it never makes the page scroll sideways.
  const [alignRight, setAlignRight] = useState(false)
  const panelId = useId()
  const buttonRef = useRef(null)
  const wrapperRef = useRef(null)
  const on = Boolean(chosen) && !quiet

  useEffect(() => {
    if (!open) return
    function onPointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function onKeyDown(event) {
    if (event.key === 'Escape' && open) {
      event.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  return (
    <li ref={wrapperRef} onKeyDown={onKeyDown} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          const box = buttonRef.current.getBoundingClientRect()
          setAlignRight(box.left + (wide ? 320 : 224) > document.documentElement.clientWidth - 16)
          setOpen(!open)
        }}
        className={`${CHIP} ${on ? CHIP_ON : CHIP_IDLE}`}
      >
        {chosen ? (
          <span>
            <span className={showName ? '' : 'sr-only'}>{name}:</span> {chosen}
          </span>
        ) : (
          name
        )}
        <Icon name="chevron-down" className={`size-4 transition-transform duration-200 ease-soft ${open ? 'rotate-180' : ''}`} />
      </button>
      <fieldset
        id={panelId}
        data-open={open}
        inert={!open}
        aria-hidden={!open}
        className={`od-pop absolute ${alignRight ? 'right-0' : 'left-0'} z-30 mt-2 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-[0_12px_28px_rgba(36,27,58,0.16)] ${wide ? 'w-[min(20rem,calc(100vw-2rem))]' : 'w-[min(14rem,calc(100vw-2rem))]'}`}
      >
        <legend className="sr-only">{name}</legend>
        {children}
      </fieldset>
    </li>
  )
}
