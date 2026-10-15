import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDepartments, getEmployerDashboard } from '../../api/employer.js'
import { useAuth } from '../../auth/authContext.js'
import { employerKind } from '../../auth/employerAccess.js'
import Button from '../../components/ui/Button.jsx'
import DashboardTile from '../../components/ui/DashboardTile.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import VerificationBadge from '../../components/ui/VerificationBadge.jsx'
import { PRIMARY_LINK, TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { NOT_ENOUGH_RESPONSES, basedOnText } from '../../lib/trustScoreText.js'

// Non-zero posting counts are listed in this order.
const COUNT_TEXT = {
  open: (count) => `${count} open`,
  pending: (count) => `${count} waiting for approval`,
  draft: (count) => (count === 1 ? '1 draft' : `${count} drafts`),
  rejected: (count) => `${count} rejected`,
  closed: (count) => `${count} closed`,
}

/** A failed load inside a tile, with a way to try again. */
function TileLoadError({ children, onRetry }) {
  return (
    <Notice tone="error">
      <p>{children}</p>
      <Button variant="link" onClick={onRetry}>
        Try again
      </Button>
    </Notice>
  )
}

/** The employer's own trust score (F8.2), linking to its page; no count below 3 responses. */
function TrustTile({ dashboard }) {
  const trust = dashboard.data?.trust_score

  return (
    <DashboardTile title="Trust score" to="/employer/trust-score" linkLabel="See your trust score">
      {dashboard.failed && <TileLoadError onRetry={dashboard.retry}>We couldn't load your trust score.</TileLoadError>}
      {trust && trust.score != null && (
        <>
          <strong>{trust.score}%</strong>
          {basedOnText(trust.responses)}
        </>
      )}
      {trust && trust.score == null && NOT_ENOUGH_RESPONSES}
      {!dashboard.data && !dashboard.failed && 'Loading…'}
    </DashboardTile>
  )
}

/** Loads the dashboard data once for the whole page (posting counts and waiting applicants). */
function useEmployerDashboard() {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    getEmployerDashboard()
      .then((loaded) => {
        setData(loaded)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, failed, retry: load }
}

/** The postings this person may see, counted by status (whole company for owners). */
function PostingsTile({ title, dashboard }) {
  const counts = dashboard.data?.postings ?? null
  const lines = counts ? Object.keys(COUNT_TEXT).filter((status) => counts[status] > 0) : []

  return (
    <DashboardTile title={title} to="/employer/job-postings" linkLabel="Manage job postings">
      {dashboard.failed && <TileLoadError onRetry={dashboard.retry}>We couldn't load your posting counts.</TileLoadError>}
      {!counts && !dashboard.failed && 'Post jobs and list the accommodations you provide.'}
      {counts && lines.length === 0 && 'No job postings yet.'}
      {lines.length > 0 && (
        <ul className="space-y-1">
          {lines.map((status) => (
            <li key={status}>{COUNT_TEXT[status](counts[status])}</li>
          ))}
        </ul>
      )}
    </DashboardTile>
  )
}

/**
 * Postings with applicants nobody has opened yet (F8.2), most first, each linking to its
 * applicants. HR officers see their own department's.
 */
function WaitingApplicants({ dashboard }) {
  const waiting = dashboard.data?.waiting_applicants

  return (
    <section aria-labelledby="waiting-heading" className="mt-8">
      <h2 id="waiting-heading" className="text-2xl font-bold">
        Applicants waiting for review
      </h2>
      {!waiting && !dashboard.failed && <p className="mt-2 text-muted">Loading your applicants…</p>}
      {dashboard.failed && (
        <div className="mt-3">
          <TileLoadError onRetry={dashboard.retry}>We couldn&apos;t load the applicants waiting for review.</TileLoadError>
        </div>
      )}
      {waiting && waiting.postings.length === 0 && <p className="mt-2">No applicants are waiting for review.</p>}
      {waiting && waiting.postings.length > 0 && (
        <ul className="mt-3">
          {waiting.postings.map((posting) => (
            <li key={posting.id} className="border-b border-border py-2 first:border-t">
              <Link to={`/employer/job-postings/${posting.id}/applicants`} className={`${TEXT_LINK} min-h-11`}>
                {`${posting.title}: ${posting.new} new`}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const VERIFICATION_TEXT = {
  not_submitted: 'Submit your registration number to get the Verified badge.',
  pending: 'An OpenDoor admin is checking your registration number.',
  verified: 'Your company is verified.',
  rejected: 'Your registration number was not accepted. See the reason and submit it again.',
}

export default function EmployerDashboard() {
  const { user } = useAuth()
  const kind = employerKind(user)
  const { employer, department } = user.membership
  const dashboard = useEmployerDashboard()

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name}`}
        documentTitle="Employer dashboard"
        actions={
          <Link to="/employer/job-postings/new" className={PRIMARY_LINK}>
            Create a job posting
          </Link>
        }
      />
      <WaitingApplicants dashboard={dashboard} />
      {kind === 'owner' && <OwnerDashboard employer={employer} dashboard={dashboard} />}
      {kind === 'hr' && (
        <>
          <p className="mt-4 max-w-prose">
            At <span className="font-bold">{employer.name}</span>, you're an HR officer in{' '}
            <span className="font-bold">{department.name}</span> and manage its job postings.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            <DashboardTile title={employer.name}>
              <span className="mt-1 block">
                <VerificationBadge status={employer.verification_status} />
              </span>
            </DashboardTile>
            <PostingsTile title={`${department.name} job postings`} dashboard={dashboard} />
            <TrustTile dashboard={dashboard} />
          </ul>
        </>
      )}
      {kind === 'individual' && (
        <>
          <p className="mt-4 max-w-prose">You're hiring as an individual employer.</p>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            <DashboardTile title="My profile" to="/employer/profile" linkLabel="Edit my profile">
              What job seekers see about you on your postings.
            </DashboardTile>
            <PostingsTile title="Job postings" dashboard={dashboard} />
            <TrustTile dashboard={dashboard} />
          </ul>
        </>
      )}
    </>
  )
}

function OwnerDashboard({ employer, dashboard }) {
  const [team, setTeam] = useState(null)
  const [teamFailed, setTeamFailed] = useState(false)

  const loadTeam = useCallback(() => {
    getDepartments()
      .then((data) => {
        setTeam(data)
        setTeamFailed(false)
      })
      .catch(() => setTeamFailed(true))
  }, [])

  useEffect(() => {
    loadTeam()
  }, [loadTeam])

  const hrCount = team?.departments.reduce((sum, department) => sum + department.hr_officers.length, 0)

  return (
    <>
      <p className="mt-4 max-w-prose">
        <span className="font-bold">{employer.name}</span> is your company. You manage its profile, team and job
        postings.
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardTile title="Company profile" to="/employer/company" linkLabel="Go to company profile">
          <span className="mb-2 block">
            <VerificationBadge status={employer.verification_status} />
          </span>
          {VERIFICATION_TEXT[employer.verification_status]}
        </DashboardTile>
        <DashboardTile title="Team" to="/employer/team" linkLabel="Manage your team">
          {teamFailed && <TileLoadError onRetry={loadTeam}>We couldn't load your team.</TileLoadError>}
          {team ? (
            <>
              {team.departments.length} {team.departments.length === 1 ? 'department' : 'departments'}, {hrCount} HR{' '}
              {hrCount === 1 ? 'officer' : 'officers'}.
              <span className="mt-2 block">
                {team.departments.map((department) => (
                  <span key={department.id} className="block text-muted">
                    {department.name}: {department.places_used} of {department.effective_limit} places used
                  </span>
                ))}
              </span>
            </>
          ) : (
            !teamFailed && 'Departments and HR officers.'
          )}
        </DashboardTile>
        <PostingsTile title="Job postings" dashboard={dashboard} />
        <TrustTile dashboard={dashboard} />
      </ul>
    </>
  )
}
