import { Link, useLocation } from 'react-router-dom'

/**
 * Links between the pages of one section, drawn as the design's tab pills (Profile and needs,
 * Account, Data). They are links, not ARIA tabs: each one opens its own page, and the current
 * one is marked with aria-current="page".
 *
 * items: [{ to, label }]; `label` names the navigation landmark.
 */
export default function PageTabs({ label, items, className = 'mt-6' }) {
  const { pathname } = useLocation()

  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          const current = pathname === item.to
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={current ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border-2 px-5 font-display font-semibold ${current ? 'border-primary bg-primary text-on-primary' : 'border-input bg-surface text-text hover:bg-primary-soft'}`}
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
