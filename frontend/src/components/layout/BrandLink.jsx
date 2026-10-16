import { Link } from 'react-router-dom'

/**
 * The OpenDoor logo and name. The image is decorative (alt=""), because the name next to it
 * already says "OpenDoor". public/opendoor-logo.svg is src/assets/base-logo.svg cropped to the
 * mascot, so the mark is taller than it is wide.
 */
export default function BrandLink({ to = '/' }) {
  return (
    <Link to={to} className="inline-flex min-h-11 shrink-0 items-center gap-2 font-display text-[1.375rem] font-semibold tracking-tight text-accent">
      <img src="/opendoor-logo.svg" alt="" width="28" height="36" className="h-9 w-7" />
      OpenDoor
    </Link>
  )
}
