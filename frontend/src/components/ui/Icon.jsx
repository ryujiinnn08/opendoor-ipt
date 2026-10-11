import { IMAGES } from './iconImages.js'

/**
 * An Icons8 icon (see iconImages.js) drawn in the current text colour. Decorative: the text
 * next to it carries the meaning. Unknown names show a plain circle.
 */
export default function Icon({ name, className = 'size-4' }) {
  const known = name in IMAGES ? name : 'circle'
  const image = `url("${IMAGES[known]}")`

  return (
    <span
      aria-hidden="true"
      data-icon={known}
      className={`inline-block shrink-0 bg-current ${className}`}
      // In Windows high-contrast mode backgrounds are replaced; keep the icon in the text colour.
      style={{
        maskImage: image,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskImage: image,
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        forcedColorAdjust: 'none',
      }}
    />
  )
}
