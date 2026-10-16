import { FieldError } from './FormField.jsx'
import { RADIO } from './fieldStyles.js'

/**
 * Large radio buttons with a title and a description, inside a fieldset with a legend.
 * Each radio's id is `${name}-${value}`, so error summaries can link to the first one.
 */
export default function RadioCardGroup({ name, legend, options, value, onChange, error, columns = 2 }) {
  const errorId = error ? `${name}-error` : undefined

  return (
    <fieldset className="mb-8" aria-describedby={errorId}>
      <legend className="text-xl font-bold">{legend}</legend>
      {error && <FieldError id={errorId}>{error}</FieldError>}
      <div className={`mt-3 grid gap-3 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {options.map((option) => {
          const selected = value === option.value
          const id = `${name}-${option.value}`
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`flex cursor-pointer gap-3 rounded-md border-2 p-4 ${selected ? 'border-primary bg-primary-soft' : 'border-input bg-surface hover:bg-subtle'}`}
            >
              {/* The title is the radio's name and the text its description, so screen readers
                  read "A company or organization, radio button" followed by the hint. */}
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={onChange}
                aria-labelledby={`${id}-title`}
                aria-describedby={option.text ? `${id}-text` : undefined}
                className={`mt-0.5 ${RADIO}`}
              />
              <span>
                <span id={`${id}-title`} className="block font-bold">
                  {option.title}
                </span>
                {option.text && (
                  <span id={`${id}-text`} className="block text-sm text-muted">
                    {option.text}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
