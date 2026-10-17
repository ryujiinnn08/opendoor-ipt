import StatusBadge from '../ui/StatusBadge.jsx'
import { ROLE_LABELS } from '../../lib/accountText.js'

const ICONS = { candidate: 'user', employer: 'building', admin: 'shield-check' }

/** An account's role as a badge with its own icon (ADMIN_USERS_PLAN §2). */
export default function RoleBadge({ role }) {
  return (
    <StatusBadge tone="info" icon={ICONS[role] ?? 'user'}>
      {ROLE_LABELS[role] ?? role}
    </StatusBadge>
  )
}
