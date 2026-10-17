import { useCallback, useEffect, useRef, useState } from 'react'
import { getDashboardActivity } from '../../api/employer.js'
import { countOf, trendText, weekLabel, weekName } from '../../lib/chartText.js'
import Button from '../ui/Button.jsx'
import { Checkbox } from '../ui/CheckboxField.jsx'
import LoadingMessage from '../ui/LoadingMessage.jsx'
import Notice from '../ui/Notice.jsx'
import SelectField from '../ui/SelectField.jsx'
import { useAnnounce } from '../ui/announcerContext.js'
import ColumnChart from '../ui/charts/ColumnChart.jsx'
import StackedBarChart from '../ui/charts/StackedBarChart.jsx'

const STATUS_SERIES = [
  { key: 'pending', label: 'Not opened yet', color: 'var(--od-chart-2)' },
  { key: 'reviewed', label: 'Reviewed', color: 'var(--od-chart-1)' },
  { key: 'hired', label: 'Hired', color: 'var(--od-chart-3)' },
  { key: 'rejected', label: 'Not selected', color: 'var(--od-chart-4)' },
]
const APPLICATION = ['application', 'applications']
const WEEK_OPTIONS = [4, 8, 12].map((weeks) => ({ value: String(weeks), label: `Last ${weeks} weeks` }))
const DEFAULT_FILTERS = { weeks: '8', job: '', statuses: [] }

/**
 * The employer dashboard's charts (UI_FEEDBACK_WAVE_B_PLAN B3), for the postings this person may
 * see. The filters above them (weeks, one job, statuses) narrow both charts and their tables; the
 * server does the counting, so a table always matches its chart.
 */
export default function EmployerActivity() {
  const announce = useAnnounce()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [activity, setActivity] = useState(null)
  const [failed, setFailed] = useState(false)
  const latest = useRef(0)
  const filtered = useRef(false)

  const load = useCallback(() => {
    const request = ++latest.current
    getDashboardActivity({ weeks: Number(filters.weeks), job: filters.job, statuses: filters.statuses })
      .then((data) => {
        if (request !== latest.current) return
        // Keep the filters this data was counted with, so the legend never runs ahead of it.
        setActivity({ ...data, filters })
        setFailed(false)
        if (filtered.current) announce('Charts updated.')
      })
      .catch(() => request === latest.current && setFailed(true))
  }, [filters, announce])

  useEffect(() => {
    load()
  }, [load])

  function change(next) {
    filtered.current = true
    setFilters((current) => ({ ...current, ...next }))
  }

  function toggleStatus(key) {
    const statuses = filters.statuses.includes(key)
      ? filters.statuses.filter((status) => status !== key)
      : STATUS_SERIES.map((series) => series.key).filter((status) => status === key || filters.statuses.includes(status))
    change({ statuses })
  }

  const isDefault = filters.weeks === DEFAULT_FILTERS.weeks && !filters.job && filters.statuses.length === 0
  const counted = activity?.filters ?? DEFAULT_FILTERS
  const series = counted.statuses.length ? STATUS_SERIES.filter((item) => counted.statuses.includes(item.key)) : STATUS_SERIES
  const rows = (activity?.applicants_by_posting ?? []).map((posting) => ({
    label: posting.title,
    values: series.map((item) => posting.counts[item.key] ?? 0),
  }))
  const busiest = rows.find((row) => row.values.some(Boolean))
  const jobs = activity?.jobs ?? []
  const chosenJob = jobs.find((job) => String(job.id) === counted.job)

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
        <>
          <fieldset className="mt-3 rounded-lg border border-border bg-surface p-5">
            <legend className="sr-only">Filter the charts</legend>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
              <SelectField
                id="activity-weeks"
                label="Weeks shown"
                options={WEEK_OPTIONS}
                value={filters.weeks}
                onChange={(event) => change({ weeks: event.target.value })}
                className="mb-0 w-full sm:w-48"
              />
              <SelectField
                id="activity-job"
                label="Job"
                options={[
                  { value: '', label: 'All jobs' },
                  ...jobs.map((job) => ({ value: String(job.id), label: job.open ? job.title : `${job.title} (closed)` })),
                ]}
                value={filters.job}
                onChange={(event) => change({ job: event.target.value })}
                className="mb-0 w-full sm:w-72"
              />
              {!isDefault && (
                <Button variant="link" onClick={() => change(DEFAULT_FILTERS)}>
                  Clear filters
                </Button>
              )}
            </div>
            <fieldset className="mt-4">
              <legend className="font-bold">Application status</legend>
              <p id="activity-status-hint" className="mt-1 text-sm text-muted">
                Leave all unticked to count every status.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {STATUS_SERIES.map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`activity-status-${item.key}`}
                      checked={filters.statuses.includes(item.key)}
                      onChange={() => toggleStatus(item.key)}
                      aria-describedby="activity-status-hint"
                    />
                    <label htmlFor={`activity-status-${item.key}`}>{item.label}</label>
                  </div>
                ))}
              </div>
            </fieldset>
          </fieldset>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ColumnChart
              title="Applications received, by week"
              summary={trendText(activity.applications_by_week, APPLICATION)}
              labels={activity.weeks.map(weekLabel)}
              names={activity.weeks.map(weekName)}
              values={activity.applications_by_week}
              unit={APPLICATION}
            />
            {rows.length > 0 ? (
              <StackedBarChart
                title="Applicants per open job"
                summary={
                  busiest
                    ? `${busiest.label} has the most: ${countOf(
                        busiest.values.reduce((sum, n) => sum + n, 0),
                        ['applicant', 'applicants'],
                      )}.`
                    : 'No applicants match these filters.'
                }
                rows={rows}
                series={series}
                unit={['applicant', 'applicants']}
              />
            ) : (
              <div className="rounded-lg border border-border bg-surface p-5">
                <h3 className="text-lg font-semibold">Applicants per open job</h3>
                <p className="mt-1 text-sm text-muted">
                  {chosenJob
                    ? `${chosenJob.title} is closed, so it isn't on this chart. The weekly chart still shows its applications.`
                    : 'No open jobs yet. Once a posting is approved, its applicants show here.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
