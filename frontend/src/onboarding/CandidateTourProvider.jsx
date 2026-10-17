import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext.js'
import { TourContext } from './tourContext.js'
import { chapterById, chapters, tourPath } from './candidateTour.js'
import { readTour, saveTour } from './tourStorage.js'
import TourGuide from './TourGuide.jsx'

export default function CandidateTourProvider({ children }) {
  const { user, role, status } = useAuth()
  // Remount all state and pending work on a user change. Nothing follows another account.
  return role === 'candidate' && status === 'authenticated' && user?.id != null
    ? <CandidateSession key={user.id} id={user.id}>{children}</CandidateSession>
    : children
}

function CandidateSession({ id, children }) {
  const [state, setState] = useState(() => readTour(id))
  const [active, setActive] = useState(false)
  const [destination, setDestination] = useState(null)
  const [completion, setCompletion] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const expected = useRef(null)
  const previousPath = useRef(location.pathname)
  const records = useRef({})
  const dirty = useRef(false)
  const launcher = useRef(null)
  const chapter = chapterById(state.currentChapterId)
  const step = chapter.steps.find((item) => item.id === state.currentStepId) ?? chapter.steps[0]
  const index = chapter.steps.indexOf(step)

  const update = useCallback((change) => setState((previous) => {
    const next = { ...previous, ...(typeof change === 'function' ? change(previous) : change) }
    saveTour(id, next)
    return next
  }), [id])

  const pause = useCallback(() => {
    setActive(false)
    setCompletion(null)
    expected.current = null
    update((previous) => ({ status: previous.status === 'completed' ? 'completed' : 'paused' }))
    requestAnimationFrame(() => {
      const target = launcher.current?.isConnected ? launcher.current : document.querySelector('main h1')
      target?.focus()
    })
  }, [update])

  // Protect real form edits made during a walkthrough, including browser Back.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty.current && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('You may have unsaved changes. Leave this page?')) {
      dirty.current = false
      blocker.proceed()
    } else {
      blocker.reset()
      // Synchronize a rejected router transition with the tour controller.
      // oxlint-disable-next-line react/set-state-in-effect
      pause()
    }
  }, [blocker, pause])

  useEffect(() => {
    function changed(event) {
      if (active && event.target.closest('main form') && event.target.closest('form')?.getAttribute('role') !== 'search') dirty.current = true
    }
    function unloading(event) {
      if (!dirty.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    document.addEventListener('input', changed)
    document.addEventListener('change', changed)
    window.addEventListener('beforeunload', unloading)
    return () => {
      document.removeEventListener('input', changed)
      document.removeEventListener('change', changed)
      window.removeEventListener('beforeunload', unloading)
    }
  }, [active])

  useEffect(() => {
    if (previousPath.current === location.pathname) return
    previousPath.current = location.pathname
    if (!active) return
    if (expected.current === location.pathname) expected.current = null
    // Manual router transitions stop the coachmarks before targeting the new page.
    // oxlint-disable-next-line react/set-state-in-effect
    else pause()
  }, [location.pathname, active, destination, pause])

  function show(nextChapter, nextIndex, all = state.all) {
    const next = nextChapter.steps[nextIndex]
    let route = next.route
    if (route.startsWith('@')) route = records.current[route.slice(1)] ?? tourPath
    expected.current = route
    setDestination(route)
    setCompletion(null)
    update({ invitation: 'accepted', status: 'in_progress', currentChapterId: nextChapter.id, currentStepId: next.id, all })
    setActive(true)
    if (location.pathname !== route) navigate(route)
  }

  function start(chapterId = 'intro', all = false, contextual = false) {
    launcher.current = document.activeElement
    records.current = {}
    const patterns = {
      job: /^\/candidate\/jobs\/\d+$/,
      apply: /^\/candidate\/jobs\/\d+\/apply$/,
      employer: /^\/candidate\/employers\/\d+$/,
      application: /^\/candidate\/applications\/\d+$/,
      feedback: /^\/candidate\/applications\/\d+\/feedback$/,
    }
    for (const [kind, pattern] of Object.entries(patterns)) {
      if (pattern.test(location.pathname)) records.current[kind] = location.pathname
    }
    const selected = chapterById(chapterId)
    const matched = contextual ? selected.steps.findIndex((item) => item.route === location.pathname || (item.route.startsWith('@') && records.current[item.route.slice(1)] === location.pathname)) : 0
    update((previous) => ({ chapterStates: Object.fromEntries(Object.entries(previous.chapterStates).filter(([key]) => all ? key === 'intro' : key !== selected.id)) }))
    show(selected, Math.max(0, matched), all)
  }

  function captureRecord(kind) {
    const patterns = {
      job: /^\/candidate\/jobs\/\d+$/,
      employer: /^\/candidate\/employers\/\d+$/,
      application: /^\/candidate\/applications\/\d+$/,
      apply: /^\/candidate\/jobs\/\d+\/apply$/,
      feedback: /^\/candidate\/applications\/\d+\/feedback$/,
    }
    const link = [...document.querySelectorAll(`[data-tour-record="${kind}"]`)]
      .find((node) => patterns[kind].test(node.getAttribute('href')) && !node.closest('[inert], [aria-hidden="true"]'))
    if (link) records.current[kind] = link.getAttribute('href')
  }

  function finish(skipped = false) {
    const chapterStates = { ...state.chapterStates, [chapter.id]: skipped ? 'skipped' : 'viewed' }
    const complete = chapters.filter((item) => item.id !== 'intro').every((item) => chapterStates[item.id] === 'viewed')
    const upcoming = state.all ? chapters[chapters.indexOf(chapter) + 1] : null
    update({ chapterStates, status: complete ? 'completed' : 'paused', ...(upcoming ? { currentChapterId: upcoming.id, currentStepId: upcoming.steps[0].id } : {}) })
    setActive(false)
    expected.current = null
    const title = skipped ? 'Explore at your own pace' : complete ? 'You’ve explored OpenDoor!' : chapter.id === 'intro' ? 'That’s the quick tour!' : `${chapter.title} — done!`
    setCompletion({ title, skipped, complete, chapter: chapter.id, next: upcoming?.id ?? null })
  }

  function next() {
    if (step.capture) captureRecord(step.capture)
    if (index + 1 < chapter.steps.length) show(chapter, index + 1)
    else finish()
  }

  const value = {
    state, active, completion, update, start, pause,
    markSaved: () => { dirty.current = false },
    dismiss: () => update({ invitation: 'dismissed' }),
    resume: () => { launcher.current = document.activeElement; show(chapter, index) },
    openHub: () => { setActive(false); setCompletion(null); update({ status: state.status === 'completed' ? 'completed' : 'paused' }); navigate(tourPath) },
  }

  return (
    <TourContext.Provider value={value}>
      {(active || completion) && <TourGuide
        key={completion ? 'completion' : 'guide'}
        chapter={chapter} step={step} index={index} destination={destination}
        next={next} back={() => show(chapter, index - 1)} skip={() => finish(true)}
        continueAll={() => completion?.next ? show(chapterById(completion.next), 0, true) : value.openHub()}
      />}
      {children}
    </TourContext.Provider>
  )
}
