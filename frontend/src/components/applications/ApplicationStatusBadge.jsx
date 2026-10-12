import { APPLICATION_STATUSES } from '../../lib/applicationText.js'
import StatusBadge from '../ui/StatusBadge.jsx'

/** An application's status as an icon and its word, never colour alone. */
export default function ApplicationStatusBadge({ status }) {
  const { tone, icon, label } = APPLICATION_STATUSES[status] ?? APPLICATION_STATUSES.pending

  return (
    <StatusBadge tone={tone} icon={icon}>
      {label}
    </StatusBadge>
  )
}
