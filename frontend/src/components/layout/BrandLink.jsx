import { Link } from 'react-router-dom'

/**
 * The OpenDoor logo and name. The image is decorative (alt=""), because the name next to it
 * already says "OpenDoor". Replace public/opendoor-logo.svg to change the logo.
 */
export default function BrandLink({ to = '/' }) {
  return (
    <Link to={to} className="inline-flex min-h-11 shrink-0 items-center gap-2.5 font-display text-[1.625rem] font-semibold tracking-tight text-accent">
      <img src="/opendoor-logo.svg" alt="" width="36" height="36" className="size-9" />
      OpenDoor
    </Link>
  )
}
