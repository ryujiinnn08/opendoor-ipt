import { initialsOf } from '../../lib/initials.js'

const SIZES = {
  md: 'size-12 text-base',
  lg: 'size-16 text-title',
  xl: 'size-24 text-title-lg',
}

/** A person's photo in a circle, or their initials. Decorative: the name is always beside it. */
export default function Avatar({ name, src, size = 'md', className = '' }) {
  if (src) return <img src={src} alt="" className={`${SIZES[size]} shrink-0 rounded-full object-cover ${className}`} />
  return (
    <span aria-hidden="true" className={`${SIZES[size]} grid shrink-0 place-items-center rounded-full bg-primary-soft font-display font-semibold text-accent ${className}`}>
      {initialsOf(name)}
    </span>
  )
}
