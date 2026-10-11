import { useEffect, useRef } from 'react'
import Button from '../ui/Button.jsx'

/**
 * Work experience or education entries (plan PHASE_3 §6.4): each one an open, labelled group
 * ("Work experience 1 of 2") with Remove, then Add. Focus follows the change: to a new entry's
 * first field, or after removing, to the next entry (or Add).
 *
 * items: objects with a stable `_key`; newItem(): a blank one; firstFieldId(index): its first field;
 * renderFields(item, index, change(field, value)): the entry's fields.
 */
export default function EntryList({ id, itemLabel, addLabel, items, onChange, newItem, firstFieldId, renderFields, max = 10 }) {
  const pendingFocus = useRef(null) // { field: index } | { entry: index } | 'add'
  const addButton = useRef(null)

  useEffect(() => {
    const target = pendingFocus.current
    if (target === null) return
    pendingFocus.current = null
    if (target === 'add') addButton.current?.focus()
    else if ('field' in target) document.getElementById(firstFieldId(target.field))?.focus()
    else document.getElementById(`${id}-${target.entry}`)?.focus()
  }, [items, id, firstFieldId])

  function add() {
    pendingFocus.current = { field: items.length }
    onChange([...items, newItem()])
  }

  function remove(index) {
    const next = items.filter((_, position) => position !== index)
    pendingFocus.current = index < next.length ? { entry: index } : 'add'
    onChange(next)
  }

  function change(index, field, value) {
    onChange(items.map((item, position) => (position === index ? { ...item, [field]: value } : item)))
  }

  return (
    <div>
      {items.map((item, index) => (
        <fieldset key={item._key} id={`${id}-${index}`} tabIndex={-1} className="border-t border-border py-6 outline-none">
          <legend className="float-left mb-4 w-full text-lg font-bold">{`${itemLabel} ${index + 1} of ${items.length}`}</legend>
          <div className="clear-left">{renderFields(item, index, (field, value) => change(index, field, value))}</div>
          <Button variant="secondary" onClick={() => remove(index)} aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}>
            Remove
          </Button>
        </fieldset>
      ))}
      <div className="border-t border-border pt-6">
        {items.length < max ? (
          <Button ref={addButton} variant="secondary" onClick={add}>
            {addLabel}
          </Button>
        ) : (
          <p className="text-muted">{`You can add up to ${max}.`}</p>
        )}
      </div>
    </div>
  )
}
