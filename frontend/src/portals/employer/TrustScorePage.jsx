import { useEffect, useState } from 'react'
import { generalErrorFrom } from '../../api/client.js'
import { getMyTrustScore } from '../../api/trustScore.js'
import TrustScoreCard from '../../components/feedback/TrustScoreCard.jsx'
import Button from '../../components/ui/Button.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'

/**
 * The employer's own accommodation trust score (F8.2): the same card job seekers see, and what it
 * means. Never an individual response, name, date or comment (the API has none).
 */
export default function TrustScorePage() {
  const [summary, setSummary] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getMyTrustScore()
      .then((loaded) => {
        if (!active) return
        setSummary(loaded)
        setLoadError(null)
      })
      .catch((error) => active && setLoadError(generalErrorFrom(error) ?? 'Something went wrong. Please try again.'))
    return () => {
      active = false
    }
  }, [attempt])

  return (
    <>
      <PageHeader title="Trust score" intro="How the people you hired on OpenDoor rated the accommodations you listed." />

      {loadError && (
        <Notice tone="error" className="mt-6">
          <p>{loadError}</p>
          <Button variant="secondary" className="mt-3" onClick={() => setAttempt((count) => count + 1)}>
            Try again
          </Button>
        </Notice>
      )}
      {!summary && !loadError && <LoadingMessage>Loading your trust score…</LoadingMessage>}

      {summary && (
        <div className="mt-8 grid max-w-3xl gap-10">
          <TrustScoreCard summary={summary} />
          <section aria-labelledby="meaning-heading">
            <h2 id="meaning-heading" className="text-2xl font-bold">
              What the score means
            </h2>
            <ul className="mt-3 max-w-prose list-disc space-y-2 pl-6">
              <li>30 days after their hire date, each person you hired on OpenDoor can rate every accommodation your job listed.</li>
              <li>
                Delivered counts as 1, partly delivered as a half and not delivered as 0. "I didn't use this" doesn't count. The score is
                the average across all your jobs, as a percentage.
              </li>
              <li>
                Job seekers see it on your page, on each job and in job lists once 3 hired employees have rated you. Each accommodation is
                shown once 3 people have rated it.
              </li>
              <li>You never see who rated you, when, or what they wrote. Each rating is final.</li>
            </ul>
          </section>
        </div>
      )}
    </>
  )
}
