import { useCallback, useEffect, useState } from 'react'
import { getDashboardActivity } from '../../api/employer.js'
import { countOf, trendText, weekLabel, weekName } from '../../lib/chartText.js'
import Button from '../ui/Button.jsx'
import LoadingMessage from '../ui/LoadingMessage.jsx'
import Notice from '../ui/Notice.jsx'
import ColumnChart from '../ui/charts/ColumnChart.jsx'
import StackedBarChart from '../ui/charts/StackedBarChart.jsx'

const STATUS_SERIES = [
  { key: 'pending', label: 'Not opened yet', color: 'var(--od-chart-2)' },
  { key: 'reviewed', label: 'Reviewed', color: 'var(--od-chart-1)' },
  { key: 'hired', label: 'Hired', color: 'var(--od-chart-3)' },
  { key: 'rejected', label: 'Not selected', color: 'var(--od-chart-4)' },
]
const APPLICATION = ['application', 'applications']

/** The employer dashboard's charts (UI_FEEDBACK_WAVE_B_PLAN B3), for the postings this person may see. */
export default function EmployerActivity() {
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

  const busiest = activity?.applicants_by_posting[0]

  return (
    <section aria-labelledby="activity-heading" className="mt-10">
      <h2 id="activity-heading" className="text-2xl font-bold">
        Applications at a glance
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
          <ColumnChart
            title="Applications received, by week"
            summary={trendText(activity.applications_by_week, APPLICATION)}
            labels={activity.weeks.map(weekLabel)}
            names={activity.weeks.map(weekName)}
            values={activity.applications_by_week}
            unit={APPLICATION}
          />
          {activity.applicants_by_posting.length > 0 ? (
            <StackedBarChart
              title="Applicants per open job"
              summary={
                busiest
                  ? `${busiest.title} has the most: ${countOf(Object.values(busiest.counts).reduce((sum, n) => sum + n, 0), ['applicant', 'applicants'])}.`
                  : ''
              }
              rows={activity.applicants_by_posting.map((posting) => ({
                label: posting.title,
                values: STATUS_SERIES.map((series) => posting.counts[series.key] ?? 0),
              }))}
              series={STATUS_SERIES}
              unit={['applicant', 'applicants']}
            />
          ) : (
            <div className="rounded-lg border border-border bg-surface p-5">
              <h3 className="text-lg font-semibold">Applicants per open job</h3>
              <p className="mt-1 text-sm text-muted">No open jobs yet. Once a posting is approved, its applicants show here.</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
