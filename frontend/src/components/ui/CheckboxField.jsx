import { FieldError } from './FormField.jsx'
import Icon from './Icon.jsx'
import { CHECKBOX, describedBy, HINT } from './fieldStyles.js'

/**
 * A checkbox with its label beside it. Put links in `hint`, never in `label`: links inside a
 * label are skipped by some screen readers and tapping them can tick the box by accident.
 */
export default function CheckboxField({ id, label, hint, error, checked, onChange, className = '' }) {
  const hintId = hint ? `${id}-hint` : null
  const errorId = error ? `${id}-error` : null

  return (
    <div className={`mb-6 ${className}`}>
      {hint && (
        <p id={hintId} className={`mb-2 ${HINT}`}>
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
      <div className="mt-2 flex items-start gap-3">
        <Checkbox
          id={id}
          name={id}
          checked={checked}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hintId, errorId)}
          className={error ? 'border-danger' : ''}
        />
        <label htmlFor={id} className="font-bold">
          {label}
        </label>
      </div>
    </div>
  )
}

/** The design's checkbox: a native input with the box and tick drawn over it. */
export function Checkbox({ className = '', ...inputProps }) {
  return (
    <span className="grid shrink-0 place-items-center">
      <input type="checkbox" className={`${CHECKBOX} ${className}`} {...inputProps} />
      <Icon
        name="check"
        className="pointer-events-none col-start-1 row-start-1 hidden size-4.5 text-on-primary peer-checked:block forced-colors:hidden"
      />
    </span>
  )
}
