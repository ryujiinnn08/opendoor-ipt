/**
 * The employer's logo, or a square with their initials when there is none (UI_FEEDBACK_PLAN
 * §3.1: real logos instead of colour tiles). Decorative: the employer's name is always beside it.
 */
export default function EmployerMark({ employer, size = 'md' }) {
  const box = size === 'lg' ? 'size-16 text-xl' : 'size-12 text-base'

  if (employer.logo_url) {
    return <img src={employer.logo_url} alt="" className={`${box} shrink-0 rounded-md border border-border bg-surface object-contain`} />
  }
  return (
    <span aria-hidden="true" className={`${box} grid shrink-0 place-items-center rounded-md border border-border bg-primary-soft font-display font-semibold text-accent`}>
      {initials(employer.name)}
    </span>
  )
}

function initials(name = '') {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join('')
}
