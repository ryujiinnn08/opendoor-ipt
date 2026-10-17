import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import { useAnnounce } from '../components/ui/announcerContext.js'
import { useCandidateTour } from './tourContext.js'
import TourMascot from './TourMascot.jsx'
import { tourGeometry } from './tourGeometry.js'
import { chapterById, chapters, tourPath } from './candidateTour.js'

function visibleTarget(names) {
  for (const name of [names].flat()) {
    const nodes = document.querySelectorAll(`[data-tour="${name}"]`)
    for (const node of nodes) {
      if (!node.closest('[inert], [aria-hidden="true"]') && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden') return node
    }
  }
  return null
}

/** Segmented progress for the current chapter; the text beside it carries the meaning. */
function Progress({ index, total }) {
  return <div aria-hidden="true" className="mt-2 flex gap-1">
    {Array.from({ length: total }, (_, n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= index ? 'bg-primary' : 'bg-primary-soft'}`} />)}
  </div>
}

export default function TourGuide({ chapter, step, index, destination, next, back, skip, continueAll }) {
  const tour = useCandidateTour()
  const location = useLocation()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const panel = useRef(null)
  const heading = useRef(null)
  const target = useRef(null)
  const [placement, setPlacement] = useState(null)
  const [spotlight, setSpotlight] = useState(null)
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [compact, setCompact] = useState(false)
  const [retry, setRetry] = useState(0)
  const completed = tour.completion
  const preview = !completed && step.route.startsWith('@') && destination === tourPath
  const last = index === chapter.steps.length - 1

  // The guide stays mounted between steps, so the spotlight glides to the next feature instead of
  // flashing. Per-step state resets here; a new page also drops the old page's spotlight.
  const stepKey = `${chapter.id}:${step.id}:${destination}`
  const [shown, setShown] = useState({ stepKey, destination })
  if (shown.stepKey !== stepKey) {
    if (shown.destination !== destination) { setSpotlight(null); setPlacement(null) }
    setShown({ stepKey, destination })
    setReady(false)
    setUnavailable(false)
    setRetry(0)
  }

  useLayoutEffect(() => {
    if (completed || preview) {
      heading.current?.focus()
      return
    }
    if (location.pathname !== destination) return
    let stopped = false
    let focused = false
    let highlighted = null
    let frame = 0
    let timedOut = false
    const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    function measure() {
      frame = 0
      if (stopped) return
      const found = visibleTarget(step.target)
      if (highlighted !== found) {
        highlighted?.classList.remove('tour-highlight')
        if (highlighted) resize?.unobserve(highlighted)
        highlighted = found
        highlighted?.classList.add('tour-highlight')
        if (highlighted) resize?.observe(highlighted)
      }
      target.current = found
      if (!found) {
        setSpotlight(null)
        setPlacement(null)
        if (timedOut) {
          setUnavailable(true)
          setReady(true)
          if (!focused) { heading.current?.focus(); focused = true }
        }
        return
      }
      setReady(true)
      setUnavailable(false)
      setCompact(found.getAttribute('data-tour') === 'compact-menu')
      if (!focused) {
        const initial = found.getBoundingClientRect()
        if (initial.bottom < 0 || initial.top > window.innerHeight) found.scrollIntoView?.({ block: 'center', behavior: 'instant' })
        heading.current?.focus({ preventScroll: true })
        focused = true
      }
      // Include an opened menu in the spotlight while its control is being demonstrated.
      const expanded = found.matches('[aria-expanded="true"]') ? found : found.querySelector('[aria-expanded="true"]')
      const menu = expanded ? document.getElementById(expanded.getAttribute('aria-controls')) : null
      const bounds = found.getBoundingClientRect()
      const menuBounds = menu?.getBoundingClientRect()
      const rect = menuBounds ? { left: Math.min(bounds.left, menuBounds.left), top: Math.min(bounds.top, menuBounds.top), right: Math.max(bounds.right, menuBounds.right), bottom: Math.max(bounds.bottom, menuBounds.bottom) } : bounds
      const width = panel.current?.offsetWidth || Math.min(350, window.innerWidth - 32)
      const height = panel.current?.offsetHeight || 400
      const geometry = tourGeometry(rect, width, height, window.innerWidth, window.innerHeight)
      setPlacement((old) => JSON.stringify(old) === JSON.stringify(geometry.placement) ? old : geometry.placement)
      setSpotlight((old) => JSON.stringify(old) === JSON.stringify(geometry.spotlight) ? old : geometry.spotlight)
    }
    function schedule() {
      if (!stopped && !frame) frame = requestAnimationFrame(measure)
    }
    const mutations = new MutationObserver(schedule)
    mutations.observe(document.querySelector('main') ?? document.body, { childList: true, subtree: true })
    // Watch menu visibility, not the mascot's per-frame SVG attributes.
    const menus = new MutationObserver(schedule)
    menus.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['aria-expanded', 'data-open', 'inert', 'data-text', 'data-menu'] })
    if (panel.current) resize?.observe(panel.current)
    measure()
    const timeout = setTimeout(() => { timedOut = true; schedule() }, 5000)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    document.addEventListener('animationend', schedule)
    document.addEventListener('transitionend', schedule)
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      clearTimeout(timeout)
      resize?.disconnect()
      mutations.disconnect()
      menus.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      document.removeEventListener('animationend', schedule)
      document.removeEventListener('transitionend', schedule)
      highlighted?.classList.remove('tour-highlight')
    }
  }, [step, destination, location.pathname, completed, preview, retry])

  useEffect(() => {
    if (ready || preview) announce(`${chapter.title}. Step ${index + 1} of ${chapter.steps.length}.`)
  }, [ready, preview, chapter, index, announce])

  useEffect(() => {
    function escape(event) {
      if (event.key !== 'Escape' || event.defaultPrevented || event.target.closest('header')) return
      event.preventDefault()
      tour.pause()
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [tour])

  // Arrow keys move through the steps while focus is in the guide (never inside a text field).
  function arrows(event) {
    if (completed || event.altKey || event.ctrlKey || event.metaKey || event.target.matches('input, textarea, select')) return
    if (event.key === 'ArrowRight') { event.preventDefault(); next() }
    if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); back() }
  }

  function goToTarget() {
    const node = target.current
    if (!node) return
    const focusable = node.matches('a,button,input,select,textarea') ? node : node.querySelector('button,input,select,textarea') ?? node.querySelector('a')
    const focus = focusable ?? node
    if (!focusable) focus.setAttribute('tabindex', '-1')
    focus.focus()
    focus.scrollIntoView?.({ block: 'center', behavior: 'instant' })
  }

  function leaveTo(path) {
    tour.pause()
    navigate(path)
  }

  const upcoming = completed?.next ? chapterById(completed.next) : null
  const explored = chapters.filter((item) => item.id !== 'intro' && tour.state.chapterStates[item.id] === 'viewed').length
  const features = chapters.length - 1
  const finish = completed && (completed.skipped
    ? { text: 'No problem. You can come back to any guide from your dashboard whenever you like.' }
    : completed.chapter === 'intro'
      ? { text: 'A good first step is adding your accommodation needs. They help Find jobs rank jobs by the support each one offers.', action: ['Add my needs', '/candidate/needs'] }
      : completed.complete
        ? { text: 'You can revisit any guide whenever you need it. Your Get started checklist still tracks your real setup.', action: ['Complete my profile', '/candidate/profile'], also: ['Find jobs', '/candidate/jobs'] }
        : { text: upcoming ? `Up next: ${upcoming.title}.` : `You’ve explored ${explored} of ${features} features. Viewing a guide never changes your profile or applications.` })

  return <>
    {spotlight && !completed && <div aria-hidden="true" className="tour-spotlight" style={spotlight} />}
    <aside aria-label="Candidate tour" className="tour-guide print:hidden tour-guide-floating" data-pointer={placement?.side} style={placement ? { top: placement.top, left: placement.left, bottom: 'auto', right: 'auto' } : undefined} ref={panel} onKeyDown={arrows}>
    <div className="flex items-start gap-3">
      {tour.state.showMascot && <TourMascot mood={completed && !completed.skipped ? 'happy' : 'guide'} animate={Boolean(completed && !completed.skipped) || (chapter.id === 'intro' && index === 0)} large={Boolean(completed)} />}
      <div className="min-w-0 flex-1">
        {completed
          ? <p className="text-sm font-bold text-muted">Your OpenDoor guide</p>
          : <>
            <p className="flex flex-wrap justify-between gap-x-3 text-sm font-bold text-muted"><span>{chapter.title}</span><span>Step {index + 1} of {chapter.steps.length}</span></p>
            <Progress index={index} total={chapter.steps.length} />
          </>}
        <h2 ref={heading} tabIndex={-1} className="mt-2 text-xl font-bold">{completed ? completed.title : step.title}</h2>
      </div>
      <button type="button" className="min-h-11 min-w-11 rounded-md border border-border font-bold" aria-label="Close tour and save progress" onClick={tour.pause}>×</button>
    </div>
    <p className="mt-3">{completed ? finish.text : compact && step.compactText ? step.compactText : step.text}</p>
    {!completed && (preview || unavailable) && <div className="mt-3 rounded-md border border-border bg-subtle p-3">
      <p className="font-bold">{preview ? 'Example — read-only' : 'This feature is not visible right now'}</p>
      <p className="mt-1">{step.example ?? 'You can retry when the page is ready, continue with this explanation, or finish later. Nothing will be changed.'}</p>
      {unavailable && <Button variant="link" onClick={() => { setReady(false); setUnavailable(false); setRetry((value) => value + 1) }}>Retry finding feature</Button>}
    </div>}
    {!completed && !ready && !preview && <p className="mt-3 text-sm text-muted">Finding this feature… You can continue or finish later.</p>}
    {completed ? <>
      <div className="mt-4 flex flex-wrap gap-2">
        {finish.action && <Button onClick={() => leaveTo(finish.action[1])}>{finish.action[0]}</Button>}
        {upcoming
          ? <Button onClick={continueAll}>Next feature</Button>
          : <Button variant={finish.action ? 'secondary' : 'primary'} onClick={continueAll}>{completed.chapter === 'intro' ? 'Explore more features' : 'Choose a feature'}</Button>}
        {finish.also && <Button variant="secondary" onClick={() => leaveTo(finish.also[1])}>{finish.also[0]}</Button>}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4">
        <Button variant="link" size="sm" onClick={tour.pause}>Close</Button>
      </div>
    </> : <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {index > 0 && <Button variant="secondary" aria-keyshortcuts="ArrowLeft" onClick={back}>Back</Button>}
        <Button className="ml-auto" aria-keyshortcuts="ArrowRight" onClick={next}>{!last ? 'Next' : chapter.id === 'intro' ? 'Finish' : 'Finish chapter'}</Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 text-sm">
        {ready && !unavailable && !preview && <Button variant="link" size="sm" onClick={goToTarget}>Go to this section</Button>}
        {step.leave && <Button variant="link" size="sm" onClick={tour.pause}>Leave tour to apply</Button>}
        {chapter.id !== 'intro' && <Button variant="link" size="sm" onClick={skip}>Skip this feature</Button>}
        <Button variant="link" size="sm" onClick={tour.pause}>Finish later</Button>
      </div>
    </>}
  </aside>
  </>
}
