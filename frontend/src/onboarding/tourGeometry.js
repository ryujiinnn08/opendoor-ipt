/** Fixed geometry never changes document flow, avoiding inline/floating feedback loops. */
export function tourGeometry(rect, width, height, viewportWidth, viewportHeight) {
  const gap = 16
  const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)))
  const left = clamp(rect.left - 8, 0, viewportWidth)
  const top = clamp(rect.top - 8, 0, viewportHeight)
  const right = clamp(rect.right + 8, left, viewportWidth)
  const bottom = clamp(rect.bottom + 8, top, viewportHeight)
  const spotlight = { left, top, width: right - left, height: bottom - top }
  const x = clamp(rect.left, gap, viewportWidth - width - gap)
  const y = clamp(rect.top, gap, viewportHeight - height - gap)
  const candidates = [
    { left: right + gap, top: y, side: 'left' },
    { left: left - width - gap, top: y, side: 'right' },
    { left: x, top: bottom + gap, side: 'top' },
    { left: x, top: top - height - gap, side: 'bottom' },
  ]
  const fit = candidates.find((pos) => pos.left >= gap && pos.top >= gap && pos.left + width <= viewportWidth - gap && pos.top + height <= viewportHeight - gap)
  // A large region may not leave enough room; dock at the opposite end of the viewport.
  const placement = fit ?? { left: viewportWidth - width - gap, top: rect.top > viewportHeight / 2 ? gap : viewportHeight - height - gap }
  return { spotlight, placement }
}
