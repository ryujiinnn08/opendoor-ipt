import { Link } from 'react-router-dom'
import MascotSad from '../../components/mascot/MascotSad.jsx'
import PageHeading from '../../components/ui/PageHeading.jsx'

/** Page not found, centred (UI_REVAMP_PLAN §5.1), with the sad mascot under his rain cloud. */
export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md text-center">
      <MascotSad className="mx-auto w-40 sm:w-48" />
      <PageHeading className="mt-4">Page not found</PageHeading>
      <p className="mt-4">The page you are looking for does not exist or has moved.</p>
      <p className="mt-4">
        <Link to="/" className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 hover:no-underline">
          Go to the home page
        </Link>
      </p>
    </div>
  )
}
