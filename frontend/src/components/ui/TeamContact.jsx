import { Link } from 'react-router-dom'
import { TEAM_EMAIL } from '../../lib/contact.js'
import { TEXT_LINK } from './buttonLinkStyles.js'

export default function TeamContact() {
  return (
    <p className="mt-6">
      Contact the OpenDoor team through our <Link to="/contact" className={TEXT_LINK}>Contact us form</Link>
      {' '}or email <a href={`mailto:${TEAM_EMAIL}`} className={TEXT_LINK}>{TEAM_EMAIL}</a>.
      {' '}This inbox is for platform support. To apply for a job, use its application page.
    </p>
  )
}
