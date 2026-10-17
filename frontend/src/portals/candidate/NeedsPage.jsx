import { useCandidateTour } from '../../onboarding/tourContext.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fieldErrorsFrom, generalErrorFrom } from '../../api/client.js'
import { getNeeds, saveNeeds } from '../../api/candidate.js'
import { getAccommodationGroups } from '../../api/masterData.js'
import AccommodationPicker from '../../components/postings/AccommodationPicker.jsx'
import Button from '../../components/ui/Button.jsx'
import ErrorSummary from '../../components/ui/ErrorSummary.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import useFormErrors from '../../hooks/useFormErrors.js'
import { summaryFrom } from '../../lib/errorSummary.js'
import PageTabs from '../../components/ui/PageTabs.jsx'
import { PROFILE_TABS } from '../../lib/sectionTabs.js'

const SAVED = 'Your needs are saved. Find jobs now ranks jobs by them.'

/**
 * The offered types plus any saved need that was retired since, under its group, so it shows
 * "(no longer offered)" and can be unticked (plan PHASE_3 §4.2).
 */
function withRetiredNeeds(groups, needs) {
  const merged = groups.map((group) => ({ ...group, accommodations: [...group.accommodations] }))
  for (const need of needs.filter((item) => !item.is_active)) {
    const item = { id: need.id, name: need.name, description: null, is_active: false }
    const group = merged.find((entry) => entry.group === need.group_name)
    if (group) group.accommodations.push(item)
    else merged.push({ group: need.group_name, accommodations: [item] })
  }
  return merged
}

/**
 * My needs (F2.2): the accommodation checklist without notes. Every state keeps the same
 * PageHeader, so the focused heading survives loading.
 */
export default function NeedsPage() {
  const tour = useCandidateTour()
  const announce = useAnnounce()
  const [lists, setLists] = useState(null) // { groups, needs }
  const [selected, setSelected] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { errors, generalError, focusKey, show, clear } = useFormErrors()

  useEffect(() => {
    let active = true
    Promise.all([getNeeds(), getAccommodationGroups()])
      .then(([needs, groups]) => {
        if (!active) return
        setLists({ groups, needs })
        setSelected(needs.map((need) => ({ id: need.id, note: '' })))
        setLoadError(null)
      })
      .catch((error) => active && setLoadError(generalErrorFrom(error) ?? 'Something went wrong. Please try again.'))
    return () => {
      active = false
    }
  }, [attempt])

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setSaved(false)
    try {
      const needs = await saveNeeds(selected.map((item) => item.id))
      clear()
      setLists((current) => ({ ...current, needs }))
      setSelected(needs.map((need) => ({ id: need.id, note: '' })))
      tour?.markSaved()
      setSaved(true)
      announce(SAVED)
    } catch (error) {
      // Every refusal is about the list as a whole (or one of its items): show it on the checklist.
      const fieldMessage = Object.entries(fieldErrorsFrom(error)).find(([field]) => field.startsWith('accommodations'))?.[1]
      show(fieldMessage ? { needs: fieldMessage } : {}, fieldMessage ? null : generalErrorFrom(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="My needs"
        intro="Tick the workplace accommodations you need. Find jobs ranks jobs by how many of them each one provides."
        tabs={<PageTabs label="Profile" items={PROFILE_TABS} />}
      />
      <p className="mt-4 max-w-prose">
        <span className="font-bold">Who sees this:</span> Only you. Employers see your needs only when you apply to one of
        their jobs.
      </p>

      {loadError && (
        <Notice tone="error" className="mt-6">
          <p>{loadError}</p>
          <Button variant="secondary" className="mt-3" onClick={() => setAttempt((count) => count + 1)}>
            Try again
          </Button>
        </Notice>
      )}

      {!lists && !loadError && <LoadingMessage>Loading your needs…</LoadingMessage>}

      {lists && (
        <div className="mt-8">
          <ErrorSummary errors={summaryFrom(errors, ['needs'], generalError)} focusKey={focusKey} />
          <form data-tour="candidate-needs" onSubmit={handleSubmit} noValidate>
            <AccommodationPicker
              id="needs"
              legend="Accommodations I need"
              groups={withRetiredNeeds(lists.groups, lists.needs)}
              value={selected}
              onChange={(value) => {
                setSelected(value)
                setSaved(false)
              }}
              error={errors.needs}
              withNotes={false}
            />
            <Button type="submit" loading={saving} loadingText="Saving…">
              Save my needs
            </Button>
          </form>
          {/* Next to the button, where a phone or magnified screen is looking. */}
          {saved && (
            <Notice tone="success" className="mt-6">
              <p>{SAVED}</p>
              <Link to="/candidate/jobs" className={TEXT_LINK}>
                Find jobs
              </Link>
            </Notice>
          )}
        </div>
      )}
    </>
  )
}
