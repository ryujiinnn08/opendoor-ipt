import TourEntry from '../../onboarding/TourEntry.jsx'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { generalErrorFrom } from '../../api/client.js'
import { getDashboard } from '../../api/candidate.js'
import { useAuth } from '../../auth/authContext.js'
import ApplicationsSummary from '../../components/applications/ApplicationsSummary.jsx'
import ProfileCard from '../../components/candidate/ProfileCard.jsx'
import JobCard from '../../components/jobs/JobCard.jsx'
import GetStarted from '../../components/onboarding/GetStarted.jsx'
import Button from '../../components/ui/Button.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeading from '../../components/ui/PageHeading.jsx'
import { PRIMARY_LINK, TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { PROFILE_SECTIONS as SECTIONS } from '../../lib/profileSections.js'

/**
 * The job seeker's dashboard (F8.1, F2.5), laid out like LinkedIn's Jobs home
 * (UI_FEEDBACK_WAVE_B_PLAN B2, B4): a profile card at the side; then Get started until it's done,
 * My applications with any feedback due first (F7.6), and either Tell us what you need or the
 * three best matches. Every state keeps the same heading.
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

  const counts = dashboard?.applications ?? { all: 0, waiting: 0, hired: 0, closed: 0 }
  // Profile sections still empty; needs have their own Get started step.
  const profileGaps = (dashboard?.missing_sections ?? []).filter((key) => key !== 'needs')

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

      {dashboard && <TourEntry welcome />}
      {dashboard && (
        <div data-tour="dashboard-content" className="mt-6 grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside aria-label="Your profile" className="lg:sticky lg:top-4">
            <ProfileCard user={user} profile={dashboard.profile} needsCount={dashboard.needs_count} />
          </aside>

          <div className="min-w-0 space-y-6">
            <GetStarted
              storageKey={`candidate-${user.id ?? user.email ?? 'me'}`}
              intro="A few steps so employers can see you and Find jobs can rank jobs for you."
              steps={[
                { label: 'Add your accommodation needs', to: '/candidate/needs', done: dashboard.needs_count > 0 },
                {
                  label: 'Complete your profile',
                  to: '/candidate/profile',
                  done: profileGaps.length === 0,
                  hint: profileGaps.length > 0 ? `Still to fill in: ${profileGaps.map((key) => SECTIONS[key].label.toLowerCase()).join(', ')}` : null,
                },
                { label: 'Upload a résumé', to: '/candidate/profile/resume', done: Boolean(dashboard.profile?.has_resume) },
                { label: 'Apply for a job', to: '/candidate/jobs', done: (dashboard.applications?.all ?? 0) > 0 },
              ]}
            />

            <ApplicationsSummary counts={counts} recent={dashboard.recent_applications} feedbackDue={dashboard.feedback_due} />

            {dashboard.needs_count === 0 ? (
              <section aria-labelledby="start-heading" className="rounded-lg border border-border bg-surface p-5 sm:p-6">
                <h2 id="start-heading" className="text-2xl font-bold">
                  Start here
                </h2>
                <p className="mt-2 max-w-prose">Tick the accommodations you need, and Find jobs ranks jobs by them.</p>
                <Link to="/candidate/needs" className={`mt-4 ${PRIMARY_LINK}`}>
                  Tell us what you need
                </Link>
              </section>
            ) : (
              <section aria-labelledby="top-matches-heading">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h2 id="top-matches-heading" className="text-2xl font-bold">
                    Your top matches
                  </h2>
                  {dashboard.top_matches.length > 0 && (
                    <Link to="/candidate/jobs" className={TEXT_LINK}>
                      See all matches
                    </Link>
                  )}
                </div>
                {dashboard.top_matches.length > 0 ? (
                  <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
                    {dashboard.top_matches.map((job) => (
                      <JobCard key={job.id} job={job} to={`/candidate/jobs/${job.id}`} />
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 rounded-lg border border-border bg-surface p-5">
                    <p className="text-lg">No open jobs meet your needs yet.</p>
                    <Link to="/candidate/jobs?show=all" className={TEXT_LINK}>
                      Browse all jobs
                    </Link>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </>
  )
}
