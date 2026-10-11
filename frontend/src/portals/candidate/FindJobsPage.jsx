import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { generalErrorFrom } from '../../api/client.js'
import { getNeeds } from '../../api/candidate.js'
import BrowseJobsPage from '../public/BrowseJobsPage.jsx'

const LINK = 'font-bold text-primary underline underline-offset-4 hover:no-underline'

/**
 * Find jobs (F5.4, F5.5): Browse jobs ranked by the job seeker's needs, starting in Matches my
 * needs. Retired needs aren't counted. Without needs it shows every job and asks for them.
 */
export default function FindJobsPage() {
  const [needsCount, setNeedsCount] = useState(undefined)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getNeeds()
      .then((needs) => {
        if (!active) return
        setError(null)
        setNeedsCount(needs.filter((need) => need.is_active).length)
      })
      .catch((loadError) => active && setError(generalErrorFrom(loadError) ?? 'Something went wrong. Please try again.'))
    return () => {
      active = false
    }
  }, [attempt])

  const intro = needsCount ? (
    <>
      {needsCount === 1 ? 'Jobs ranked by whether they meet your need.' : `Jobs ranked by how many of your ${needsCount} needs they meet.`}{' '}
      <Link to="/candidate/needs" className={LINK}>
        Change my needs
      </Link>
    </>
  ) : (
    'Find open jobs and see which accommodations each one provides.'
  )

  return (
    <BrowseJobsPage
      title="Find jobs"
      intro={intro}
      basePath="/candidate/jobs"
      matching={{
        needsCount,
        error,
        onRetry: () => {
          setError(null)
          setAttempt((count) => count + 1)
        },
      }}
    />
  )
}
