import Notice from '../../components/ui/Notice.jsx'
import PageHeading from '../../components/ui/PageHeading.jsx'

/**
 * /admin/users/new: name and email; shows the temporary password once (plan PHASE_6 §4.1, Q4).
 * Scaffold until 6A step 2.
 */
export default function AddAdminPage() {
  return (
    <div className="max-w-2xl">
      <PageHeading>Add an administrator</PageHeading>
      <Notice className="mt-6">This page is being built.</Notice>
    </div>
  )
}
