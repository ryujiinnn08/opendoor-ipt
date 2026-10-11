import { useState } from 'react'
import AccommodationPicker from '../postings/AccommodationPicker.jsx'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import SelectField from '../ui/SelectField.jsx'

/**
 * Category and accommodation filters for a job list (plan PHASE_3 §6.4). On phones it is one
 * Filters section that opens in place and says how many filters are on; nothing traps focus.
 * onChange receives { category } or { accommodations }.
 */
export default function AccommodationFilterPanel({ filters, categories, groups, onChange, onClear, activeCount, listsError = false }) {
  const [open, setOpen] = useState(false)
  const toggleLabel = activeCount > 0 ? `Filters, ${activeCount} on` : 'Filters'

  return (
    <section aria-labelledby="job-filters-heading">
      <h2 id="job-filters-heading" className="text-2xl font-bold">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="job-filters"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-md border-2 border-primary bg-surface px-4 text-left text-primary lg:hidden"
        >
          {toggleLabel}
          <Icon name="chevron-down" className={`size-5 ${open ? 'rotate-180' : ''}`} />
        </button>
        <span className="hidden lg:inline">Filters</span>
      </h2>

      <div id="job-filters" className={open ? 'mt-4' : 'mt-4 hidden lg:block'}>
        {listsError && <p className="mb-4 text-muted">We couldn't load the filters. Reload the page to try again.</p>}

        <SelectField
          id="filter-category"
          label="Category"
          placeholder="Any category"
          options={categories.map((category) => ({ value: String(category.id), label: category.name }))}
          value={filters.category}
          onChange={(event) => onChange({ category: event.target.value })}
        />

        <AccommodationPicker
          id="filter-accommodations"
          legend="Accommodations provided"
          hint="Show jobs that provide every one you tick."
          groups={groups}
          value={filters.accommodations.map((id) => ({ id, note: '' }))}
          onChange={(value) => onChange({ accommodations: value.map((item) => item.id) })}
          withNotes={false}
        />

        {activeCount > 0 && (
          <Button variant="link" onClick={onClear}>
            Clear all filters
          </Button>
        )}
      </div>
    </section>
  )
}
