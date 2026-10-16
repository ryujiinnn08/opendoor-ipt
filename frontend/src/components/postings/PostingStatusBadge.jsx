import StatusBadge from '../ui/StatusBadge.jsx'

const STATUSES = {
  draft: { tone: 'neutral', icon: 'pencil', label: 'Draft' },
  pending: { tone: 'warning', icon: 'alert', label: 'Waiting for approval' },
  open: { tone: 'success', icon: 'check', label: 'Open' },
  rejected: { tone: 'danger', icon: 'cross', label: 'Rejected' },
  closed: { tone: 'neutral', icon: 'lock', label: 'Closed' },
  // Removed by an administrator (Phase 6A); the reason is shown in a sentence beside it.
  removed: { tone: 'neutral', icon: 'cross', label: 'Removed by OpenDoor' },
}

/** A posting's status as an icon and text, never color alone. */
export default function PostingStatusBadge({ status }) {
  const { tone, icon, label } = STATUSES[status] ?? STATUSES.draft

  return (
    <StatusBadge tone={tone} icon={icon}>
      {label}
    </StatusBadge>
  )
}
