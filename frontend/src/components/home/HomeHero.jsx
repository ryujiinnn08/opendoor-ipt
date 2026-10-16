import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/authContext.js'
import { dashboardFor } from '../../auth/redirects.js'
import { ArrowPill } from '../ui/Button.jsx'
import { PRIMARY_LINK, SECONDARY_LINK, TEXT_LINK } from '../ui/buttonLinkStyles.js'
import Icon from '../ui/Icon.jsx'
import IconTile from '../ui/IconTile.jsx'
import PageHeading from '../ui/PageHeading.jsx'
import Mascot from './Mascot.jsx'

// The kinds of support every job lists (the accommodation groups), where the reference layout
// has its row of small icons.
const SUPPORT = [
  { icon: 'accessibility', tone: 'pink', label: 'Physical access' },
  { icon: 'chat', tone: 'lilac', label: 'Communication' },
  { icon: 'clock', tone: 'sky', label: 'Work arrangement' },
  { icon: 'eye', tone: 'orange', label: 'Assistive technology' },
]

/** Each piece of the copy arrives a little after the one before it. */
const step = (index) => ({ animationDelay: `${120 + index * 90}ms` })

/**
 * The top of Home: the headline, what OpenDoor is, the two main actions and the kinds of support,
 * with the waving mascot beside them (below them on phones). On first view the words slide in from
 * the left and the mascot slides in from the right; Reduce motion shows everything at once.
 */
export default function HomeHero() {
  const { status, role } = useAuth()
  const loggedIn = status === 'authenticated'

  return (
    <section aria-labelledby="home-title" className="grid overflow-x-clip items-center gap-x-10 gap-y-6 md:grid-cols-[1.2fr_1fr]">
      <div className="max-w-2xl">
        <PageHeading
          title="Find work that fits how you work"
          size="text-[clamp(2.25rem,1.2rem+3.4vw,3.75rem)] leading-[1.12]"
          className="tracking-tight"
        >
          <span id="home-title" className="block">
            <span className="block animate-hero-text" style={step(0)}>
              Find work that
            </span>{' '}
            <span className="block animate-hero-text" style={step(1)}>
              fits{' '}
              <span className="od-highlight inline-block rounded-2xl bg-orange px-3 whitespace-nowrap">how you work</span>
            </span>
          </span>
        </PageHeading>

        <p className="mt-6 max-w-[46ch] animate-hero-text text-lg text-muted" style={step(2)}>
          A job platform for persons with disabilities in the Philippines. Every job shows the workplace support it
          offers, and people who were hired confirm it was really provided.
        </p>

        <div className="mt-8 flex animate-hero-text flex-wrap gap-3" style={step(3)}>
          {loggedIn ? (
            <>
              <Link to={dashboardFor(role)} className={PRIMARY_LINK}>
                Go to my dashboard
                <ArrowPill />
              </Link>
              <Link to={role === 'candidate' ? '/candidate/jobs' : '/jobs'} className={SECONDARY_LINK}>
                Find jobs
              </Link>
            </>
          ) : (
            <>
              <Link to="/register?type=candidate" className={PRIMARY_LINK}>
                Register as a job seeker
                <ArrowPill />
              </Link>
              <Link to="/register?type=employer" className={SECONDARY_LINK}>
                Register as an employer
              </Link>
            </>
          )}
        </div>

        {!loggedIn && (
          <p className="mt-4 animate-hero-text" style={step(4)}>
            Already have an account?{' '}
            <Link to="/login" className={`${TEXT_LINK} min-h-0`}>
              Log in
            </Link>
          </p>
        )}

        <div className="mt-10 animate-hero-text" style={step(5)}>
          <p id="home-support" className="text-sm font-bold text-muted">
            Every job lists the support it offers:
          </p>
          <ul aria-labelledby="home-support" className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
            {SUPPORT.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm font-bold">
                <IconTile icon={item.icon} tone={item.tone} />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative isolate order-first mx-auto w-full max-w-sm md:order-none md:max-w-none">
        {/* A soft violet disc behind him and two twinkling sparkles: decoration only. */}
        <div aria-hidden="true" className="od-decoration absolute inset-[8%_6%_4%] -z-10 animate-fade-in rounded-full bg-primary-soft" />
        <span aria-hidden="true" className="od-decoration absolute top-[6%] left-[6%] animate-twinkle text-primary">
          <Icon name="sparkle" className="size-8 fill-current" />
        </span>
        <span aria-hidden="true" className="od-decoration absolute right-[4%] bottom-[22%] animate-twinkle text-orange [animation-delay:1.4s]">
          <Icon name="sparkle" className="size-10 fill-current" />
        </span>
        <div className="animate-hero-mascot" style={{ animationDelay: '380ms' }}>
          <Mascot />
        </div>
      </div>
    </section>
  )
}
