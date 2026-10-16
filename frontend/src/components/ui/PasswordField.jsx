import { useEffect, useRef, useState } from 'react'
import { checkPassword } from '../../lib/passwordRules.js'
import { useAnnounce } from './announcerContext.js'
import Icon from './Icon.jsx'
import { FieldError } from './FormField.jsx'
import { buttonClasses } from './buttonLinkStyles.js'
import { describedBy, HINT, inputClasses } from './fieldStyles.js'

/**
 * Password input with a "Show password" toggle and, optionally, a live checklist of the
 * password rules. The checklist is linked with aria-describedby (read when the field is
 * focused) and "All password requirements met" is announced once all rules pass.
 */
export default function PasswordField({ id, label, hint, error, value, onChange, showRules = false, autoComplete }) {
  const [visible, setVisible] = useState(false)
  const announce = useAnnounce()
  const rules = checkPassword(value)
  const allMet = rules.every((rule) => rule.met)
  const wasAllMet = useRef(allMet)

  useEffect(() => {
    if (showRules && allMet && !wasAllMet.current) announce('All password requirements met.')
    wasAllMet.current = allMet
  }, [allMet, showRules, announce])

  const hintId = hint ? `${id}-hint` : null
  const errorId = error ? `${id}-error` : null
  const rulesId = showRules ? `${id}-rules` : null

  return (
    <div className="mb-6">
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className={HINT}>
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
      <div className="mt-2 flex max-w-md gap-2">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hintId, errorId, rulesId)}
          className={inputClasses(Boolean(error))}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-controls={id}
          aria-pressed={visible}
          aria-label={`${visible ? 'Hide' : 'Show'} password`}
          className={`${buttonClasses('secondary', 'sm')} min-h-13 shrink-0`}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>

      {showRules && (
        <div id={rulesId} className="mt-3">
          <p className="font-bold">Your password needs:</p>
          <ul className="mt-1 space-y-1">
            {rules.map((rule) => (
              <li key={rule.id} className={`flex items-center gap-2 ${rule.met ? 'text-success' : 'text-muted'}`}>
                <Icon name={rule.met ? 'check' : 'circle'} className="size-5" />
                <span>
                  {rule.label} <span className="sr-only">{rule.met ? '(done)' : '(not done yet)'}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
