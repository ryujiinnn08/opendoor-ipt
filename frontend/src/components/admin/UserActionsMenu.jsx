import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import { buttonClasses } from '../ui/buttonLinkStyles.js'

const ITEM = 'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left transition-colors duration-200 ease-soft hover:bg-primary-soft'

/**
 * A row's Actions button in the admin user list (ADMIN_USERS_PLAN U5): View, Edit details, and
 * Suspend or Reactivate. A disclosure like the account menu: Escape or a click outside closes it,
 * and Escape puts focus back on the button. `own` hides the actions you can't take on yourself.
 */
export default function UserActionsMenu({ user, own, viewTo, viewState, onAction }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const buttonRef = useRef(null)
  const wrapperRef = useRef(null)

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
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  // Focus goes back to Actions first, so a cancelled dialog returns there (the panel goes inert).
  function choose(action) {
    setOpen(false)
    buttonRef.current?.focus()
    onAction(action)
  }

  return (
    <div ref={wrapperRef} onKeyDown={onKeyDown} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Actions for ${user.name}`}
        onClick={() => setOpen(!open)}
        className={buttonClasses('secondary', 'sm')}
      >
        Actions
        <Icon name="chevron-down" className={`size-4 transition-transform duration-200 ease-soft ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={panelId}
        data-open={open}
        inert={!open}
        aria-hidden={!open}
        className="od-pop absolute right-0 z-30 mt-2 w-56 rounded-lg border border-border bg-surface p-2 shadow-[0_12px_28px_rgba(36,27,58,0.16)]"
      >
        <ul className="grid gap-0.5">
          <li>
            <Link to={viewTo} state={viewState} className={`${ITEM} text-text`}>
              <Icon name="eye" className="size-5 text-accent" />
              View account
            </Link>
          </li>
          {!own && (
            <>
              <li>
                <button type="button" onClick={() => choose('edit')} className={`${ITEM} text-text`}>
                  <Icon name="pencil" className="size-5 text-accent" />
                  Edit details
                </button>
              </li>
              <li className="mt-1 border-t border-border pt-1">
                {user.is_active ? (
                  <button type="button" onClick={() => choose('suspend')} className={`${ITEM} font-bold text-danger hover:bg-danger-soft`}>
                    <Icon name="lock" className="size-5" />
                    Suspend
                  </button>
                ) : (
                  <button type="button" onClick={() => choose('reactivate')} className={`${ITEM} font-bold text-primary`}>
                    <Icon name="refresh" className="size-5" />
                    Reactivate
                  </button>
                )}
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  )
}
