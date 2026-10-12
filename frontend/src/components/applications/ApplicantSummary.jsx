import { employerMatchText } from '../../lib/matchText.js'
import Icon from '../ui/Icon.jsx'
import { TEXT_LINK } from '../ui/buttonLinkStyles.js'

/**
 * The applicant page's first column on phones (plan PHASE_4 §7): the interview accommodation
 * request first, since it's what the employer must act on, then how the job meets their needs,
 * then how to reach them. Ink rules: these are the job seeker's needs, not the employer's promises.
 */
export default function ApplicantSummary({ applicant }) {
  const { match, profile } = applicant

  return (
    <div className="space-y-10">
      <section aria-labelledby="interview-heading" className="border-l-4 border-text pl-5">
        <h2 id="interview-heading" className="text-2xl font-bold">
          Interview accommodation request
        </h2>
        {applicant.interview_request ? (
          <p className="mt-2 max-w-prose text-lg whitespace-pre-line">{applicant.interview_request}</p>
        ) : (
          <p className="mt-2 text-muted">They didn&apos;t ask for anything for the interview.</p>
        )}
      </section>

      <section aria-labelledby="needs-heading" className="border-l-4 border-text pl-5">
        <h2 id="needs-heading" className="text-2xl font-bold">
          Their needs and your job
        </h2>
        {match ? (
          <>
            <p className="mt-2 font-bold">{employerMatchText(match)}</p>
            <ul className="mt-3 space-y-2">
              {match.needs.map((need) => (
                <li key={need.id} className="flex gap-2">
                  <span className={`mt-0.5 ${need.provided ? 'text-accent' : 'text-muted'}`}>
                    <Icon name={need.provided ? 'check' : 'circle'} className="size-5" />
                  </span>
                  <span>
                    <span className={need.provided ? 'font-bold' : ''}>{`${need.name}: ${need.provided ? 'Provided' : 'Missing'}`}</span>
                    {need.provided && need.note && <span className="block text-muted">{need.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-muted">They haven&apos;t listed any accommodation needs.</p>
        )}
      </section>

      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="text-2xl font-bold">
          Contact
        </h2>
        <ul className="mt-2 space-y-1">
          <li>
            <a href={`mailto:${profile.email}`} className={`${TEXT_LINK} break-all`}>
              {profile.email}
            </a>
          </li>
          {profile.contact_number && (
            <li>
              <a href={`tel:${profile.contact_number.replace(/[^\d+]/g, '')}`} className={TEXT_LINK}>
                {profile.contact_number}
              </a>
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
