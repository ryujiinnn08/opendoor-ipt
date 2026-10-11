import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { generalErrorFrom } from '../../api/client.js'
import { getDashboard } from '../../api/candidate.js'
import { useAuth } from '../../auth/authContext.js'
import JobCard from '../../components/jobs/JobCard.jsx'
import Button from '../../components/ui/Button.jsx'
import DashboardTile from '../../components/ui/DashboardTile.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeading from '../../components/ui/PageHeading.jsx'
import { PRIMARY_LINK, TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'

// The profile sections the dashboard asks for (F2.5), with where each one is filled in.
const SECTIONS = {
  headline: { label: 'Headline', to: '/candidate/profile#profile-basic' },
  location: { label: 'City or municipality and province', to: '/candidate/profile#profile-basic' },
  contact_number: { label: 'Contact number', to: '/candidate/profile#profile-basic' },
  education: { label: 'Education', to: '/candidate/profile#profile-education' },
  skills: { label: 'Skills', to: '/candidate/profile#profile-skills' },
  needs: { label: 'Accommodation needs', to: '/candidate/needs' },
}

/**
 * The job seeker's dashboard (F8.1, F2.5). Until needs are saved, its main action is
 * Tell us what you need; then it shows the three best matches. Below, the profile sections
 * still missing. Every state keeps the same heading.
 */
export default function CandidateDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getDashboard()
      .then((loaded) => {
        if (!active) return
        setDashboard(loaded)
        setLoadError(null)
      })
      .catch((error) => active && setLoadError(generalErrorFrom(error) ?? 'Something went wrong. Please try again.'))
    return () => {
      active = false
    }
  }, [attempt])

  return (
    <>
      <PageHeading title="Candidate dashboard">Welcome, {user.name}</PageHeading>

      {loadError && (
        <Notice tone="error" className="mt-6">
          <p>{loadError}</p>
          <Button variant="secondary" className="mt-3" onClick={() => setAttempt((count) => count + 1)}>
            Try again
          </Button>
        </Notice>
      )}
      {!dashboard && !loadError && <LoadingMessage>Loading your dashboard…</LoadingMessage>}

      {dashboard && (
        <>
          {dashboard.needs_count === 0 ? (
            <section aria-labelledby="start-heading" className="mt-8 max-w-prose">
              <h2 id="start-heading" className="text-2xl font-bold">
                Start here
              </h2>
              <p className="mt-2">Tick the accommodations you need, and Find jobs ranks jobs by them.</p>
              <Link to="/candidate/needs" className={`mt-4 ${PRIMARY_LINK}`}>
                Tell us what you need
              </Link>
            </section>
          ) : (
            <section aria-labelledby="top-matches-heading" className="mt-8">
              <h2 id="top-matches-heading" className="text-2xl font-bold">
                Your top matches
              </h2>
              {dashboard.top_matches.length > 0 ? (
                <>
                  <ul className="mt-4">
                    {dashboard.top_matches.map((job) => (
                      <JobCard key={job.id} job={job} to={`/candidate/jobs/${job.id}`} />
                    ))}
                  </ul>
                  <p className="mt-4">
                    <Link to="/candidate/jobs" className={TEXT_LINK}>
                      See all matches
                    </Link>
                  </p>
                </>
              ) : (
                <div className="mt-4 border-y border-border py-6">
                  <p className="text-lg">No open jobs meet your needs yet.</p>
                  <Link to="/candidate/jobs?show=all" className={TEXT_LINK}>
                    Browse all jobs
                  </Link>
                </div>
              )}
            </section>
          )}

          {dashboard.missing_sections.length > 0 && (
            <section aria-labelledby="finish-heading" className="mt-10">
              <h2 id="finish-heading" className="text-2xl font-bold">
                Finish your profile
              </h2>
              <p className="mt-2 max-w-prose">Employers learn more about you when these are filled in:</p>
              <ul className="mt-2">
                {dashboard.missing_sections.map((key) => (
                  <li key={key}>
                    <Link to={SECTIONS[key].to} className={TEXT_LINK}>
                      {SECTIONS[key].label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            <DashboardTile title="My applications" comingSoon>
              Follow the status of every job you apply for.
            </DashboardTile>
          </ul>
        </>
      )}
    </>
  )
}
