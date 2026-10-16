import { useLayoutEffect, useRef, useState } from 'react'

/** The width of the box a chart sits in, so its SVG is drawn at real size (text never stretches). */
export function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(560)
  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return
    const measure = () => box.clientWidth > 0 && setWidth(box.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

/** The root font size in px, so chart text follows the Text size setting. */
export function rootPx() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
}

/** Round tick steps: the smallest of 1, 2, 5, 10… that gives at most 4 gridlines. */
export function niceMax(max) {
  if (max <= 4) return 4
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((size) => Math.ceil(max / size) <= 4) ?? 1000
  return Math.ceil(max / step) * step
}

