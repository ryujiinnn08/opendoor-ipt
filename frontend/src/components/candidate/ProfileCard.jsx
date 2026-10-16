import { Link } from 'react-router-dom'
import { getPhotoFile } from '../../api/candidate.js'
import usePrivateImage from '../../hooks/usePrivateImage.js'
import Avatar from './Avatar.jsx'
import { TEXT_LINK } from '../ui/buttonLinkStyles.js'

/**
 * The job seeker's card at the side of the dashboard (UI_FEEDBACK_WAVE_B_PLAN B2, after
 * LinkedIn's Jobs home): photo or initials, name, headline and place, how many needs are set,
 * and the pages they use most.
 */
export default function ProfileCard({ user, profile, needsCount }) {
  const place = [profile?.city, profile?.province].filter(Boolean).join(', ')
  const photo = usePrivateImage(getPhotoFile, profile?.has_photo ? profile.photo_version : null)

  return (
    <section aria-labelledby="profile-card-heading" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div aria-hidden="true" className="od-decoration h-14 bg-lilac" />
      <div className="px-5 pb-5">
        <Avatar name={user.name} src={photo} size="lg" className="-mt-8 border-4 border-surface" />
        <h2 id="profile-card-heading" className="mt-2 text-2xl font-bold">
          {user.name}
        </h2>
        {profile?.headline && <p>{profile.headline}</p>}
        {place && <p className="text-sm text-muted">{place}</p>}
        <p className="mt-3 border-t border-border pt-3 text-sm">
          {needsCount === 0 ? 'No accommodation needs set yet. ' : `${needsCount} accommodation ${needsCount === 1 ? 'need' : 'needs'} set. `}
          <Link to="/candidate/needs" className="font-bold text-primary underline underline-offset-4 hover:no-underline">
            {needsCount === 0 ? 'Add them' : 'Change'}
          </Link>
        </p>
        <ul className="mt-2 border-t border-border pt-1">
          <li>
            <Link to="/candidate/profile" className={TEXT_LINK}>
              Edit profile
            </Link>
          </li>
          <li>
            <Link to="/candidate/profile/resume" className={TEXT_LINK}>
              My résumé
            </Link>
          </li>
        </ul>
      </div>
    </section>
  )
}
