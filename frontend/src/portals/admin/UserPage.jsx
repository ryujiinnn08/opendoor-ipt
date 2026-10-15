import Notice from '../../components/ui/Notice.jsx'
import PageHeading from '../../components/ui/PageHeading.jsx'

/**
 * /admin/users/:id: the account, what it's connected to, its history, and Suspend or
 * Reactivate (plan PHASE_6 §4.1, §7). Scaffold until 6A step 2.
 */
export default function UserPage() {
  return (
    <div className="max-w-4xl">
      <PageHeading>User</PageHeading>
      <Notice className="mt-6">This page is being built.</Notice>
    </div>
  )
}
