import { Link, useSearchParams } from 'react-router-dom'

/**
 * Filter links (e.g., Waiting · Verified · Rejected). The active one is marked with
 * aria-current="true" ("current item"; the menu link already marks the current page).
 * Switching keeps the other filters in the address, e.g., the chosen department, except those in
 * `resetParams` (e.g., the page number, which belongs to the previous filter).
 */
export default function FilterTabs({ label, items, current, param = 'status', resetParams = [] }) {
  const [searchParams] = useSearchParams()

  function hrefFor(value) {
    const next = new URLSearchParams(searchParams)
    next.set(param, value)
    for (const name of resetParams) next.delete(name)
    return `?${next}`
  }

  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = item.value === current
          return (
            <li key={item.value}>
              <Link
                to={hrefFor(item.value)}
                aria-current={active ? 'true' : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 font-display font-semibold ${active ? 'border-primary bg-primary text-on-primary' : 'border-input bg-surface text-text hover:bg-primary-soft'}`}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
