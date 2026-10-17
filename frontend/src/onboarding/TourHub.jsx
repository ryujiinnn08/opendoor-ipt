import { Link } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'
import { chapterById, chapters } from './candidateTour.js'
import { useCandidateTour } from './tourContext.js'

export default function TourHub() {
  const tour = useCandidateTour()
  if (!tour) return null
  const { state } = tour
  const features = chapters.filter((item) => item.id !== 'intro')
  const explored = features.filter((item) => state.chapterStates[item.id] === 'viewed').length
  const resumable = state.status === 'paused' && !state.chapterStates[state.currentChapterId]
  const introSeen = Boolean(state.chapterStates.intro)
  return <>
    <PageHeading>Explore OpenDoor</PageHeading>
    <p className="mt-3 max-w-prose">Each guide points out the real buttons and pages, one at a time. Take them in any order, or read them below as plain text. Exploring a guide never changes your profile or applications.</p>
    <div className="mt-5 max-w-md">
      <p className="flex justify-between text-sm font-bold"><span>Your progress</span><span>{explored} of {features.length} explored</span></p>
      <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-primary-soft">
        <div className="h-full rounded-full bg-yellow" style={{ width: `${(explored / features.length) * 100}%` }} />
      </div>
    </div>
    <div className="my-5 flex flex-wrap gap-3">
      {resumable && <Button onClick={tour.resume}>Continue tour: {chapterById(state.currentChapterId).title}</Button>}
      <Button variant={resumable || introSeen ? 'secondary' : 'primary'} onClick={() => tour.start('intro')}>{introSeen ? 'Replay introduction' : 'Start introduction'}</Button>
      <Button variant={!resumable && introSeen ? 'primary' : 'secondary'} onClick={() => tour.start('display', true)}>Tour all features</Button>
    </div>
    <label className="flex min-h-11 items-center gap-3 font-bold">
      <input type="checkbox" checked={state.showMascot} onChange={(event) => tour.update({ showMascot: event.target.checked })} /> Show mascot in tour
    </label>
    <p className="text-sm text-muted">Progress is saved for this account in this browser. Quiet mode and reduced motion keep the mascot still. In a tour, use the arrow keys to move between steps and Escape to finish later.</p>
    <ol className="mt-6 grid gap-4 md:grid-cols-2">
      {chapters.map((chapter) => {
        const status = state.chapterStates[chapter.id]
        return <li key={chapter.id} className={`rounded-lg border bg-surface p-5 ${status === 'viewed' ? 'border-success' : 'border-border'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{chapter.title}</h2>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-muted">
              {status === 'viewed' && <Icon name="check" className="size-4 text-success" />}
              {{ viewed: 'Viewed', skipped: 'Skipped' }[status] ?? 'Not viewed'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{chapter.steps.length} short steps</p>
          <Button className="mt-3" variant="secondary" onClick={() => tour.start(chapter.id)}>Explore {chapter.title.toLowerCase()}</Button>
          <details className="mt-4">
            <summary className="min-h-11 cursor-pointer font-bold text-primary">Read this guide</summary>
            <ol className="grid gap-4">
              {chapter.steps.map((step) => <li key={step.id}>
                <h3 className="font-bold">{step.title}</h3><p className="mt-1">{step.text}</p>
                {step.example && <p className="mt-2 rounded-md bg-subtle p-3">{step.example}</p>}
                {!step.route.startsWith('@') && <Link className="inline-flex min-h-11 items-center font-bold text-primary underline" to={step.route}>Open this page</Link>}
              </li>)}
            </ol>
          </details>
        </li>
      })}
    </ol>
    <div className="mt-6 flex flex-wrap gap-5">
      <Link to="/candidate/profile" className="font-bold text-primary underline">Complete my profile</Link>
      <Link to="/candidate/jobs" className="font-bold text-primary underline">Find jobs</Link>
    </div>
  </>
}
