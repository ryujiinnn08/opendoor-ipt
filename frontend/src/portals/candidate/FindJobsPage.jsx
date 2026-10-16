import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { generalErrorFrom } from '../../api/client.js'
import { getNeeds, getProfile } from '../../api/candidate.js'
import BrowseJobsPage from '../public/BrowseJobsPage.jsx'

const LINK = 'font-bold text-primary underline underline-offset-4 hover:no-underline'
const OPEN_TO_OFF = 'opendoor-open-to-off'

function openToSwitchedOff() {
  try {
    return window.sessionStorage.getItem(OPEN_TO_OFF) === '1'
  } catch {
    return false
  }
}

function switchOpenToOff() {
  try {
    window.sessionStorage.setItem(OPEN_TO_OFF, '1')
  } catch {
    // Not remembered; off for this page only.
  }
}

/**
 * Find jobs (F5.4, F5.5): Browse jobs ranked by the job seeker's needs, starting in Matches my
 * needs. Retired needs aren't counted. Without needs it shows every job and asks for them.
 */
export default function FindJobsPage() {
  const [needsCount, setNeedsCount] = useState(undefined)
  // Open to (UI_FEEDBACK_WAVE_B_PLAN B1, Q3): opened with no work setup or type in the address,
  // Find jobs starts from the profile's choices and says so. Switching them off lasts for the visit.
  const [searchParams, setSearchParams] = useSearchParams()
  const latestParams = useRef(searchParams)
  useEffect(() => {
    latestParams.current = searchParams
  }, [searchParams])
  const [usingOpenTo, setUsingOpenTo] = useState(false)

  useEffect(() => {
    let active = true
    getProfile()
      .then((profile) => {
        const setups = profile.open_to_work_setups ?? []
        const types = profile.open_to_employment_types ?? []
        const params = new URLSearchParams(latestParams.current)
        if (!active || setups.length + types.length === 0 || params.has('work_setup') || params.has('type') || openToSwitchedOff()) return
        if (setups.length > 0) params.set('work_setup', setups.join(','))
        if (types.length > 0) params.set('type', types.join(','))
        setSearchParams(params, { replace: true, preventScrollReset: true })
        setUsingOpenTo(true)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [setSearchParams])
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
      openToNote={
        usingOpenTo
          ? {
              onDismiss: () => {
                switchOpenToOff()
                setUsingOpenTo(false)
              },
            }
          : null
      }
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
