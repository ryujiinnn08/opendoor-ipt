import { Link } from 'react-router-dom'
import { pageItems } from '../../lib/pageItems.js'

const ITEM = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 font-bold'
const LINK = `${ITEM} text-primary underline underline-offset-4 hover:bg-primary-soft hover:no-underline`

/**
 * Previous, page numbers and Next as links, so every page has its own address. The current
 * page is marked for screen readers; each target is at least 44 px. Nothing for one page.
 */
export default function Pagination({ page, lastPage, hrefForPage, label = 'Pages' }) {
  if (!lastPage || (lastPage <= 1 && page <= lastPage)) return null

  return (
    <nav aria-label={label} className="mt-8">
      <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {page > 1 && (
          <li>
            <Link to={hrefForPage(Math.min(page - 1, lastPage))} className={LINK}>
              Previous
            </Link>
          </li>
        )}
        {pageItems(page, lastPage).map((item, index) => (
          <li key={item === 'gap' ? `gap-${index}` : item}>
            {item === 'gap' ? (
              <span aria-hidden="true" className={`${ITEM} text-muted`}>
                …
              </span>
            ) : item === page ? (
              <span aria-current="page" className={`${ITEM} bg-primary text-on-primary`}>
                <span className="sr-only">Page </span>
                {item}
              </span>
            ) : (
              <Link to={hrefForPage(item)} aria-label={`Page ${item}`} className={LINK}>
                {item}
              </Link>
            )}
          </li>
        ))}
        {page < lastPage && (
          <li>
            <Link to={hrefForPage(page + 1)} className={LINK}>
              Next
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
