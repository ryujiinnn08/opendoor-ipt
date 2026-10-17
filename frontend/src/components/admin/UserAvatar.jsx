import { useCallback } from 'react'
import { getUserPhoto } from '../../api/admin.js'
import usePrivateImage from '../../hooks/usePrivateImage.js'
import Avatar from '../candidate/Avatar.jsx'
import EmployerMark from '../jobs/EmployerMark.jsx'

/**
 * An account's picture in the admin user list and page (ADMIN_USERS_PLAN): the company's logo or
 * mark for employers, a job seeker's photo when they share it with employers, otherwise initials.
 * Decorative: the name is always beside it.
 */
export default function UserAvatar({ user, size = 'md' }) {
  if (user.role === 'employer' && user.employer) return <EmployerMark employer={user.employer} size={size === 'md' ? 'md' : 'lg'} />
  return <PersonAvatar user={user} size={size} />
}

function PersonAvatar({ user, size }) {
  const load = useCallback(() => getUserPhoto(user.id), [user.id])
  const src = usePrivateImage(load, user.profile?.photo_version)
  return <Avatar name={user.name} src={src} size={size} />
}
