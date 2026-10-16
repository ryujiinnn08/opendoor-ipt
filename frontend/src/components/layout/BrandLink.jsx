import { Link } from 'react-router-dom'

/**
 * The OpenDoor logo and name. The image is decorative (alt=""), because the name next to it
 * already says "OpenDoor". public/opendoor-logo.svg is src/assets/base-logo.svg cropped to the
 * mascot, so the mark is taller than it is wide.
 */
export default function BrandLink({ to = '/' }) {
  return (
    <Link to={to} className="inline-flex min-h-11 shrink-0 items-center gap-2.5 font-display text-[1.625rem] font-semibold tracking-tight text-accent">
      <img src="/opendoor-logo.svg" alt="" width="32" height="40" className="h-10 w-8" />
      OpenDoor
    </Link>
  )
}
