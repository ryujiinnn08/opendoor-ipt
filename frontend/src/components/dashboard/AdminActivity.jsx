import { useCallback, useEffect, useState } from 'react'
import { getDashboardActivity } from '../../api/admin.js'
import { trendText, weekLabel, weekName } from '../../lib/chartText.js'
import Button from '../ui/Button.jsx'
import LoadingMessage from '../ui/LoadingMessage.jsx'
import Notice from '../ui/Notice.jsx'
import ColumnChart from '../ui/charts/ColumnChart.jsx'
import LineChart from '../ui/charts/LineChart.jsx'
import StackedBarChart from '../ui/charts/StackedBarChart.jsx'

/** OpenDoor's last 8 weeks for administrators (UI_FEEDBACK_WAVE_B_PLAN B3), under the queues. */
export default function AdminActivity() {
  const [activity, setActivity] = useState(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    getDashboardActivity()
      .then((data) => {
        setActivity(data)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const labels = activity?.weeks.map(weekLabel)
  const names = activity?.weeks.map(weekName)
  const verification = activity?.verification

  return (
    <section aria-labelledby="activity-heading" className="mt-12">
      <h2 id="activity-heading" className="text-2xl font-bold">
        The last 8 weeks
      </h2>
      {failed && (
        <Notice tone="error" className="mt-3">
          <p>We couldn&apos;t load the charts.</p>
          <Button variant="link" onClick={load}>
            Try again
          </Button>
        </Notice>
      )}
      {!activity && !failed && <LoadingMessage>Loading the charts…</LoadingMessage>}
      {activity && (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <LineChart
            title="New accounts, by week"
            summary={`Job seekers: ${trendText(activity.job_seekers_by_week, ['new account', 'new accounts'])}`}
            labels={labels}
            names={names}
            series={[
              { key: 'seekers', label: 'Job seekers', color: 'var(--od-chart-1)', values: activity.job_seekers_by_week },
              { key: 'employers', label: 'Employers', color: 'var(--od-chart-3)', values: activity.employers_by_week },
            ]}
          />
          <ColumnChart
            title="Job postings approved, by week"
            summary={trendText(activity.postings_approved_by_week, ['posting approved', 'postings approved'])}
            labels={labels}
            names={names}
            values={activity.postings_approved_by_week}
            unit={['posting', 'postings']}
            color="var(--od-chart-2)"
          />
          <LineChart
            title="Applications and hires, by week"
            summary={`${trendText(activity.applications_by_week, ['application', 'applications'])} Hires: ${activity.hires_by_week.reduce((sum, n) => sum + n, 0)} in 8 weeks.`}
            labels={labels}
            names={names}
            series={[
              { key: 'applications', label: 'Applications', color: 'var(--od-chart-1)', values: activity.applications_by_week },
              { key: 'hires', label: 'Hires', color: 'var(--od-chart-3)', values: activity.hires_by_week },
            ]}
          />
          <StackedBarChart
            title="Company verification"
            summary={`${verification.waiting} waiting for a decision, ${verification.verified} verified, ${verification.not_approved} not approved.`}
            rows={[
              { label: 'Waiting for a decision', values: [verification.waiting] },
              { label: 'Verified', values: [verification.verified] },
              { label: 'Not approved', values: [verification.not_approved] },
            ]}
            series={[{ key: 'companies', label: 'Companies', color: 'var(--od-chart-1)' }]}
            unit={['company', 'companies']}
          />
        </div>
      )}
    </section>
  )
}
