import { Link } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import { useCandidateTour } from './tourContext.js'
import TourMascot from './TourMascot.jsx'
import { chapterById, chapters, tourPath } from './candidateTour.js'

export default function TourEntry({ welcome = false }) {
  const tour = useCandidateTour()
  if (!tour || tour.active || tour.completion) return null
  const { state } = tour
  const invited = welcome && state.invitation === 'pending'
  const resumable = ['paused', 'in_progress'].includes(state.status) && !state.chapterStates[state.currentChapterId]
  const introSeen = Boolean(state.chapterStates.intro)
  const features = chapters.filter((item) => item.id !== 'intro')
  const explored = features.filter((item) => state.chapterStates[item.id] === 'viewed').length
  const titleId = welcome ? 'tour-welcome-title' : 'tour-entry-title'

  // After the introduction, a slim card keeps the guides one click away without crowding the dashboard.
  if (!invited && !resumable && introSeen) {
    return <section aria-labelledby={titleId} className="my-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-lg border border-border bg-primary-soft px-5 py-3">
      <div>
        <h2 id={titleId} className="font-bold">Explore OpenDoor</h2>
        <p className="text-sm text-muted">{explored === features.length ? 'You’ve explored every guide. Revisit any of them whenever you need.' : `${explored} of ${features.length} feature guides explored`}</p>
      </div>
      <Link className="inline-flex min-h-11 items-center font-bold text-primary underline" to={tourPath}>See all guides</Link>
    </section>
  }

  const nextStop = resumable ? chapterById(state.currentChapterId).steps.find((item) => item.id === state.currentStepId) : null
  const text = invited
    ? 'I’ll show you where things are in about 2 minutes. You can skip any step or come back later.'
    : resumable
      ? `Ready to continue? Your next stop is “${nextStop?.title ?? chapterById(state.currentChapterId).title}”.`
      : 'A quick 2-minute tour of where to find jobs, set up your profile, and follow your applications.'

  return <section aria-labelledby={titleId} className="my-6 rounded-lg border border-border bg-primary-soft p-5">
    <div className="flex items-center gap-4">
      {state.showMascot && <TourMascot large={invited} />}
      <div>
        <h2 id={titleId} className="text-xl font-bold">{invited ? 'Welcome to OpenDoor!' : 'Explore OpenDoor'}</h2>
        <p className="mt-2">{text}</p>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button onClick={resumable ? tour.resume : () => tour.start()}>{invited ? 'Start tour' : resumable ? 'Continue tour' : 'Take a tour'}</Button>
      {resumable && <Button variant="secondary" onClick={() => tour.start()}>Start again</Button>}
      <Link className="inline-flex min-h-11 items-center font-bold text-primary underline" to={tourPath}>Read the guide</Link>
      {invited && <Button variant="link" onClick={tour.dismiss}>Explore on my own</Button>}
    </div>
  </section>
}
