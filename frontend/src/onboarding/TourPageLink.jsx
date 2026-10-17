import Button from '../components/ui/Button.jsx'
import { useLocation } from 'react-router-dom'
import { useCandidateTour } from './tourContext.js'

export default function TourPageLink() {
  const tour = useCandidateTour()
  const { pathname } = useLocation()
  if (!tour || tour.active || tour.completion || pathname === '/candidate/dashboard' || pathname === '/candidate/tour') return null
  const chapter = pathname.endsWith('/feedback') ? 'feedback'
    : /^\/candidate\/jobs\/\d+\/apply$/.test(pathname) ? 'apply'
    : /^\/candidate\/jobs\/\d+$/.test(pathname) ? 'job'
    : pathname.startsWith('/candidate/employers/') ? 'employer'
    : pathname.startsWith('/candidate/applications') ? 'applications'
    : ({ '/candidate/needs': 'needs', '/candidate/profile': 'profile', '/candidate/profile/resume': 'resume', '/candidate/jobs': 'jobs', '/notifications': 'notifications', '/account/display': 'display', '/account/password': 'support', '/help': 'support', '/contact': 'support' })[pathname]
  if (!chapter) return null
  return <div className="mb-4 print:hidden"><Button variant="link" size="sm" onClick={() => tour.start(chapter, false, true)}>Show me around this page</Button></div>
}
