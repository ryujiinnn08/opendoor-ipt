import Notice from '../../components/ui/Notice.jsx'
import PageHeading from '../../components/ui/PageHeading.jsx'

/**
 * /account/password in every portal: current password, new password, confirm (plan PHASE_6
 * §4.1, F1.6, Q5). New administrators are sent here first. Scaffold until 6A step 2.
 */
export default function ChangePasswordPage() {
  return (
    <div className="max-w-2xl">
      <PageHeading>Change password</PageHeading>
      <Notice className="mt-6">This page is being built.</Notice>
    </div>
  )
}
