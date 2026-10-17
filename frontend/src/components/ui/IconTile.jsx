import Icon from './Icon.jsx'

const TONES = { orange: 'bg-orange', pink: 'bg-pink', sky: 'bg-sky', lilac: 'bg-lilac', yellow: 'bg-yellow' }

const SIZES = {
  md: { box: 'size-11 rounded-md', icon: 'size-6' },
  lg: { box: 'size-20 rounded-lg', icon: 'size-9' },
}

/**
 * The Figma IconTile: an icon on a coloured square. Decoration only (the label next to it
 * carries the meaning), so it is hidden from screen readers; Quiet mode turns the colour
 * into the plain violet tint.
 */
export default function IconTile({ icon, tone = 'lilac', size = 'md' }) {
  const { box, icon: iconSize } = SIZES[size]

  return (
    <span aria-hidden="true" className={`od-tile inline-grid shrink-0 place-items-center text-text ${box} ${TONES[tone] ?? TONES.lilac}`}>
      <Icon name={icon} className={iconSize} />
    </span>
  )
}

