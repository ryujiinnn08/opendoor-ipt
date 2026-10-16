import { FieldError } from './FormField.jsx'
import Icon from './Icon.jsx'
import { describedBy, HINT, inputClasses } from './fieldStyles.js'

/**
 * options: [{ value, label, disabled? }]
 */
export default function SelectField({ id, label, hint, error, options, placeholder, className = '', ...selectProps }) {
  const hintId = hint ? `${id}-hint` : null
  const errorId = error ? `${id}-error` : null

  return (
    <div className={`mb-6 ${className}`}>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className={HINT}>
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
      <SelectBox>
        <select
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hintId, errorId)}
          className={inputClasses(Boolean(error), 'cursor-pointer appearance-none pr-12 forced-colors:appearance-auto')}
          {...selectProps}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </SelectBox>
    </div>
  )
}

/** Wraps a <select> to draw the design's chevron over it (the browser's arrow is hidden). */
export function SelectBox({ className = 'mt-2 max-w-md', children }) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 forced-colors:hidden" />
    </div>
  )
}
