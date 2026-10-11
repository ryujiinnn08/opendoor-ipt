import { formatMonth } from '../../lib/format.js'
import { optionLabel } from '../../lib/postingOptions.js'
import { DISABILITY_TYPES, EDUCATION_LEVELS } from '../../lib/profileOptions.js'

function Part({ title, children }) {
  return (
    <section className="mt-8 break-inside-avoid border-t border-border pt-6 print:mt-6 print:pt-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/**
 * A job seeker's profile laid out as a résumé (plan PHASE_3 §6.4). The page supplies the name
 * as its <h1>. Empty sections are left out; the disability type appears only when the person
 * chose to show it to employers. Phase 4 shows the same view to employers they apply to.
 */
export default function ResumeView({ profile }) {
  const place = [profile.city, profile.province].filter(Boolean).join(', ')
  const contact = [place, profile.contact_number, profile.email].filter(Boolean)
  const showDisability = profile.show_disability && profile.disability_type

  return (
    <div className="max-w-3xl">
      {profile.headline && <p className="mt-2 text-xl">{profile.headline}</p>}
      {contact.length > 0 && (
        <ul className="mt-3 text-muted print:text-black">
          {contact.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      {profile.about && (
        <Part title="About">
          <p className="max-w-prose whitespace-pre-line">{profile.about}</p>
        </Part>
      )}

      {profile.experiences.length > 0 && (
        <Part title="Work experience">
          <ul className="space-y-5">
            {profile.experiences.map((entry, index) => (
              <li key={index} className="break-inside-avoid">
                <h3 className="text-lg font-bold">{entry.job_title}</h3>
                <p>{entry.company}</p>
                <p className="text-muted print:text-black">
                  {`${formatMonth(entry.started_on)} to ${entry.is_current ? 'now' : formatMonth(entry.ended_on)}`}
                </p>
                {entry.description && <p className="mt-1 max-w-prose whitespace-pre-line">{entry.description}</p>}
              </li>
            ))}
          </ul>
        </Part>
      )}

      {profile.educations.length > 0 && (
        <Part title="Education">
          <ul className="space-y-5">
            {profile.educations.map((entry, index) => (
              <li key={index} className="break-inside-avoid">
                <h3 className="text-lg font-bold">{optionLabel(EDUCATION_LEVELS, entry.level)}</h3>
                <p>{entry.school}</p>
                {entry.course && <p>{entry.course}</p>}
                {(entry.is_studying || entry.year_finished) && (
                  <p className="text-muted print:text-black">{entry.is_studying ? 'Still studying' : `Finished ${entry.year_finished}`}</p>
                )}
              </li>
            ))}
          </ul>
        </Part>
      )}

      {profile.skills && (
        <Part title="Skills">
          <p className="max-w-prose">{profile.skills}</p>
        </Part>
      )}
      {profile.trainings && (
        <Part title="Trainings and certifications">
          <p className="max-w-prose whitespace-pre-line">{profile.trainings}</p>
        </Part>
      )}
      {profile.languages && (
        <Part title="Languages">
          <p className="max-w-prose">{profile.languages}</p>
        </Part>
      )}
      {showDisability && (
        <Part title="Disability type">
          <p>{optionLabel(DISABILITY_TYPES, profile.disability_type)}</p>
        </Part>
      )}
    </div>
  )
}
