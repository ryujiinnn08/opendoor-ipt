import { Link } from 'react-router-dom'
import { TEAM_EMAIL } from '../../lib/contact.js'

const LINK = 'inline-flex min-h-11 items-center px-2 text-sm text-muted underline-offset-4 hover:text-text hover:underline'

/** The footer on every page: the privacy notice, the accessibility statement and the contact form. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <nav aria-label="Footer" className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <ul className="flex flex-wrap items-center justify-center gap-x-4">
          <li>
            <Link to="/help" className={LINK}>
              How OpenDoor works
            </Link>
          </li>
          <li>
            <Link to="/privacy" className={LINK}>
              Privacy
            </Link>
          </li>
          <li>
            <Link to="/accessibility" className={LINK}>
              Accessibility statement
            </Link>
          </li>
          <li>
            <Link to="/contact" className={LINK}>
              Contact us
            </Link>
          </li>
          <li>
            <a href={`mailto:${TEAM_EMAIL}`} className={LINK}>{TEAM_EMAIL}</a>
          </li>
        </ul>
      </nav>
    </footer>
  )
}
