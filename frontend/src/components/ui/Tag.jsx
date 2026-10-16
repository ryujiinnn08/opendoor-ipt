/** The Figma Tag: a tinted pill for an accommodation or a rating ("+1 more" too). */
export default function Tag({ children, as: Element = 'span' }) {
  return <Element className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-sm text-accent">{children}</Element>
}
