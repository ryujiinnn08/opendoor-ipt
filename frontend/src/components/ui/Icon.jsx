import { ICONS } from './iconImages.js'

/**
 * A Lucide icon (see iconImages.js) drawn in the current text colour, so it follows links,
 * badges and the high-contrast theme. Decorative: the text next to it carries the meaning.
 * Unknown names show a plain circle.
 */
export default function Icon({ name, className = 'size-4' }) {
  const known = name in ICONS ? name : 'circle'
  const Svg = ICONS[known]

  return <Svg aria-hidden="true" focusable="false" data-icon={known} strokeWidth={2} className={`inline-block shrink-0 ${className}`} />
}
