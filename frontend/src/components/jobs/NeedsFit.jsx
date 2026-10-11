import { matchCountText } from '../../lib/matchText.js'
import Icon from '../ui/Icon.jsx'

/**
 * The job page's checklist of the job seeker's needs (plan PHASE_3 §7): each one Provided (with
 * the employer's note) or Missing. Ink rule for "your needs", beside the amber "Accommodations
 * provided" panel for the employer's promises.
 * match: { needs_total, needs_met, needs: [{ id, name, provided, note }] }
 */
export default function NeedsFit({ match }) {
  return (
    <section aria-labelledby="needs-fit-heading" className="border-l-4 border-text pl-5">
      <h2 id="needs-fit-heading" className="text-2xl font-bold">
        How this job fits your needs
      </h2>
      <p className="mt-2 font-bold">{matchCountText(match)}</p>
      <ul className="mt-3 space-y-2">
        {match.needs.map((need) => (
          <li key={need.id} className="flex gap-2">
            {need.provided ? (
              <span className="mt-0.5 text-accent">
                <Icon name="check" className="size-5" />
              </span>
            ) : (
              <span className="mt-0.5 text-muted">
                <Icon name="circle" className="size-5" />
              </span>
            )}
            <span>
              {need.provided ? (
                <span className="font-bold">{`${need.name}: Provided`}</span>
              ) : (
                <span>{`${need.name}: Missing. You can ask the employer about it.`}</span>
              )}
              {need.provided && need.note && <span className="block text-muted">{need.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
