import { Link } from 'react-router-dom'
import { formatDay } from '../../lib/format.js'
import { EMPLOYMENT_TYPES, INTERVIEW_FORMATS, optionLabel, WORK_SETUPS } from '../../lib/postingOptions.js'
import TrustScoreChip from '../feedback/TrustScoreChip.jsx'
import { DotList } from '../jobs/JobCard.jsx'
import EmployerMark from '../jobs/EmployerMark.jsx'
import Icon from '../ui/Icon.jsx'
import { TEXT_LINK } from '../ui/buttonLinkStyles.js'
import VerificationBadge from '../ui/VerificationBadge.jsx'
import AccommodationGroupIcon from './AccommodationGroupIcon.jsx'

/** Consecutive accommodations of the same group, in the order the API sorted them. */
function byGroup(accommodations) {
  const groups = []
  for (const item of accommodations) {
    const last = groups.at(-1)
    if (last?.group === item.group_name) last.items.push(item)
    else groups.push({ group: item.group_name, items: [item] })
  }
  return groups
}

const CARD = 'rounded-lg border border-border bg-surface p-5 sm:p-6'

function Detail({ icon, label, children }) {
  return (
    <div>
      <dt className="flex items-center gap-2 font-bold">
        <Icon name={icon} className="size-5 text-accent" />
        {label}
      </dt>
      <dd className="pl-7">{children || <span className="text-muted">Not added yet</span>}</dd>
    </div>
  )
}

/**
 * A posting as job seekers will see it (plan PHASE_2 §4.10), used by the Preview, the admin
 * Review and the public job page. Laid out like Indeed's and LinkedIn's job pages
 * (UI_FEEDBACK_PLAN §3.4): the employer block, then Accommodations provided (always first, they
 * are the point of OpenDoor), Job details, About the job and, on the public page, About the
 * company. The page around it supplies the title (h1) and the status. `markRetired` labels retired
 * accommodation types for admins (decision 31). With `employerHref` (the public job page), the
 * employer's name links to their page and the trust score shows beside it. `fit` (the job seeker's
 * NeedsFit, Apply and the trust score card) is a side column, first on phones; `stacked` (the
 * Find jobs details pane) keeps one column with `fit` first.
 */
export default function JobDetails({ posting, showVerificationStatus = false, markRetired = false, employerHref, fit, stacked = false }) {
  const { employer } = posting
  const company = employer.type === 'company'
  const groups = byGroup(posting.accommodations ?? [])
  const ids = {
    accommodations: `posting-${posting.id}-accommodations`,
    details: `posting-${posting.id}-details`,
    about: `posting-${posting.id}-about`,
    company: `posting-${posting.id}-company`,
  }
  const facts = [posting.location, optionLabel(WORK_SETUPS, posting.work_setup), optionLabel(EMPLOYMENT_TYPES, posting.employment_type)].filter(Boolean)
  const aboutCompany = employerHref && (employer.description || employer.industry || employer.address)

  return (
    <div data-tour="job-details">
      <div className={`mt-4 flex flex-wrap items-start gap-4 ${CARD}`}>
        <EmployerMark employer={employer} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-lg font-bold">
              {employerHref ? (
                <Link data-tour-record="employer" to={employerHref} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4 hover:no-underline">
                  {employer.name}
                </Link>
              ) : (
                employer.name
              )}
            </p>
            {company && (showVerificationStatus || employer.is_verified) && (
              <VerificationBadge status={employer.verification_status ?? (employer.is_verified ? 'verified' : 'not_submitted')} />
            )}
            {!company && <p className="text-muted">Individual employer</p>}
          </div>
          {posting.department && <p>Department: {posting.department.name}</p>}
          {facts.length > 0 && (
            <p className="mt-1 text-muted">
              <DotList items={facts} />
            </p>
          )}
          {employerHref && <TrustScoreChip employer={employer} className="mt-3" />}
        </div>
      </div>

      <div className={`mt-6 grid gap-6 ${fit && !stacked ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}>
        {fit && <div className={`space-y-6 ${stacked ? '' : 'lg:col-start-2 lg:row-start-1'}`}>{fit}</div>}

        <div className={`min-w-0 space-y-6 ${stacked ? '' : 'lg:col-start-1 lg:row-start-1'}`}>
          <section aria-labelledby={ids.accommodations} className={`${CARD} border-l-4 border-l-accent`}>
            <h2 id={ids.accommodations} className="text-2xl font-bold">
              Accommodations provided
            </h2>
            {groups.length === 0 ? (
              <p className="mt-3 text-muted">No accommodations added yet.</p>
            ) : (
              <div className="mt-4 space-y-5">
                {groups.map((group) => (
                  <div key={group.group}>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-accent">
                      <AccommodationGroupIcon group={group.group} />
                      {group.group}
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {group.items.map((item) => (
                        <li key={item.id} className="flex gap-2">
                          <Icon name="check" className="mt-1 size-5 text-accent" />
                          <span>
                            <span className="font-bold">
                              {markRetired && item.is_active === false ? `${item.name} (no longer offered)` : item.name}
                            </span>
                            {item.note && <span className="block text-muted">{item.note}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby={ids.details} className={CARD}>
            <h2 id={ids.details} className="text-2xl font-bold">
              Job details
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail icon="building" label="Work setup">{optionLabel(WORK_SETUPS, posting.work_setup)}</Detail>
              <Detail icon="clock" label="Employment type">{optionLabel(EMPLOYMENT_TYPES, posting.employment_type)}</Detail>
              <Detail icon="map-pin" label="Location">{posting.location}</Detail>
              <Detail icon="chat" label="Interview">{optionLabel(INTERVIEW_FORMATS, posting.interview_format)}</Detail>
              <Detail icon="calendar" label="Apply by">{formatDay(posting.closes_on)}</Detail>
              <Detail icon="briefcase" label="Category">{posting.category?.name}</Detail>
            </dl>
          </section>

          <section aria-labelledby={ids.about} className={CARD}>
            <h2 id={ids.about} className="text-2xl font-bold">
              About the job
            </h2>
            {posting.description ? (
              <p className="mt-3 max-w-prose whitespace-pre-line">{posting.description}</p>
            ) : (
              <p className="mt-3 text-muted">Not added yet</p>
            )}
          </section>

          {aboutCompany && (
            <section aria-labelledby={ids.company} className={CARD}>
              <h2 id={ids.company} className="text-2xl font-bold">
                About the company
              </h2>
              <div className="mt-4 flex items-center gap-3">
                <EmployerMark employer={employer} />
                <div>
                  <p className="font-bold">{employer.name}</p>
                  {(employer.industry || employer.address) && (
                    <p className="text-sm text-muted">
                      <DotList items={[employer.industry, employer.address].filter(Boolean)} />
                    </p>
                  )}
                </div>
              </div>
              {employer.description && <p className="mt-4 max-w-prose whitespace-pre-line">{employer.description}</p>}
              <Link to={employerHref} className={`mt-3 ${TEXT_LINK}`}>
                See this employer&apos;s trust score and open jobs
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
