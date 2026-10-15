import Notice from '../../components/ui/Notice.jsx'
import PageHeading from '../../components/ui/PageHeading.jsx'

/**
 * /admin/users: every account, searchable by name or email, filtered by role and status,
 * 20 a page (plan PHASE_6 §4.1, F10.1). Scaffold until 6A step 2.
 */
export default function UsersPage() {
  return (
    <div className="max-w-4xl">
      <PageHeading>Users</PageHeading>
      <Notice className="mt-6">This page is being built.</Notice>
    </div>
  )
}
