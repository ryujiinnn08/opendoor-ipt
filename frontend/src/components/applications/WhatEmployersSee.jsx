import { Link } from 'react-router-dom'
import { DISABILITY_TYPES } from '../../lib/profileOptions.js'
import { optionLabel } from '../../lib/postingOptions.js'
import { emptyProfileSections, PROFILE_SECTIONS } from '../../lib/profileSections.js'
import { TEXT_LINK } from '../ui/buttonLinkStyles.js'

/**
 * The Apply page's preview of what is shared with the employer (plan PHASE_4 §4.1), so the job
 * seeker agrees knowingly. Empty profile sections are a gentle warning, never a block (Q1).
 * `loadState` says when the list can't yet name everything (loading, or the profile failed).
 */
export default function WhatEmployersSee({ profile, loadState = 'ready' }) {
  const empty = profile ? emptyProfileSections(profile) : []
  const disability = profile?.show_disability && profile.disability_type ? optionLabel(DISABILITY_TYPES, profile.disability_type) : null

  return (
    <section aria-labelledby="employer-sees-heading" className="border-l-4 border-text pl-5">
      <h2 id="employer-sees-heading" className="text-2xl font-bold">
        What the employer will see
      </h2>
      {loadState === 'loading' && <p className="mt-2 text-muted">Checking your profile…</p>}
      {loadState === 'error' && (
        <p className="mt-2">We couldn&apos;t load your profile, so this list may leave something out. Check My résumé before you send.</p>
      )}
      <ul className="mt-3 list-disc space-y-1 pl-6">
        <li>
          <Link to="/candidate/profile/resume" className={TEXT_LINK}>
            Your profile and My résumé
          </Link>
        </li>
        {profile?.resume && <li>{`Your uploaded résumé: ${profile.resume.name}`}</li>}
        <li>
          <Link to="/candidate/needs" className={TEXT_LINK}>
            Your accommodation needs
          </Link>
        </li>
        {disability && <li>{`Your disability type: ${disability}`}</li>}
        <li>Your email and contact number</li>
      </ul>
      {empty.length > 0 && (
        <>
          <p className="mt-4">These parts of your profile are empty:</p>
          <ul className="mt-1 list-disc pl-6">
            {empty.map((key) => (
              <li key={key}>
                <Link to={PROFILE_SECTIONS[key].to} className={TEXT_LINK}>
                  {PROFILE_SECTIONS[key].label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted">You can still apply now and fill them in later.</p>
        </>
      )}
    </section>
  )
}
