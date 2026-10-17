import TourEntry from '../../onboarding/TourEntry.jsx'
import { useState } from 'react'
import { useAuth } from '../../auth/authContext.js'
import { employerSummary } from '../../auth/employerAccess.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import Button from '../../components/ui/Button.jsx'
import Notice from '../../components/ui/Notice.jsx'
import { showGetStartedAgain } from '../../lib/getStarted.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import PageTabs from '../../components/ui/PageTabs.jsx'
import { ACCOUNT_TABS } from '../../lib/sectionTabs.js'
import { RADIO } from '../../components/ui/fieldStyles.js'
import { useDisplaySettings } from '../../display/displayContext.js'
import TextSizeSlider from '../../components/ui/TextSizeSlider.jsx'

const GROUPS = [
  {
    name: 'contrast',
    legend: 'Colours',
    options: [
      { value: 'standard', label: 'Standard colours' },
      { value: 'high', label: 'High contrast' },
    ],
  },
  {
    name: 'motion',
    legend: 'Motion',
    options: [
      { value: 'allow', label: 'Allow animations' },
      { value: 'reduce', label: 'Reduce motion' },
    ],
  },
  {
    name: 'quiet',
    legend: 'Decoration',
    hint: 'Quiet hides the sparkles and orange arrows, and makes the coloured icon squares plain.',
    options: [
      { value: false, label: 'Show sparkles and colours' },
      { value: true, label: 'Quiet: plain and calm' },
    ],
  },
  {
    name: 'menu',
    legend: 'Top menu',
    options: [
      { value: 'full', label: 'Show all links' },
      { value: 'compact', label: 'Compact: one Menu button' },
    ],
  },
  {
    name: 'bar',
    legend: 'Display settings bar',
    hint: 'The bar at the very top with Text size and High contrast. On phones and tablets it always shows, and it opens when you reach it with the keyboard.',
    options: [
      { value: 'auto', label: 'Hide it until I point at it' },
      { value: 'pinned', label: 'Always show it' },
    ],
  },
]

const ROLE_NAMES = { candidate: 'Job seeker', admin: 'Administrator' }

/**
 * /account/display (05 Shared 7.2): every display setting in one place. Changes apply at once and
 * are saved in this browser (UI_REVAMP_PLAN Q5); the utility bar changes the same settings.
 */
export default function DisplayPage() {
  const { user } = useAuth()
  const { settings, update } = useDisplaySettings()
  const announce = useAnnounce()
  const [saved, setSaved] = useState(false)
  const who = [user.name, user.email, ROLE_NAMES[user.role] ?? employerSummary(user)].filter(Boolean).join(' · ')

  function choose(name, value) {
    update({ [name]: value })
    setSaved(true)
    announce('Display settings applied and saved on this device.')
  }

  return (
    <>
      <PageHeader title="Account" documentTitle="Display settings" intro={who} tabs={<PageTabs label="Account settings" items={ACCOUNT_TABS} />} />

      <section aria-labelledby="display-title" className="mt-6 rounded-lg border-2 border-border bg-surface p-5 sm:p-6">
        <h2 id="display-title" className="sr-only">
          Display
        </h2>
        <p className="text-sm text-muted">Changes apply right away and are saved on this device.</p>

        <div className="mt-5 max-w-md">
          <TextSizeSlider
            id="display-text"
            value={settings.text}
            onChange={(text) => {
              update({ text })
              setSaved(true)
            }}
          />
        </div>

        <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <fieldset key={group.name}>
              <legend className="text-lg font-semibold">{group.legend}</legend>
              {group.hint && (
                <p id={`display-${group.name}-hint`} className="mt-1 text-sm text-muted">
                  {group.hint}
                </p>
              )}
              <div className="mt-2 space-y-1">
                {group.options.map((option) => {
                  const id = `display-${group.name}-${option.value}`
                  return (
                    <div key={id} className="flex min-h-11 items-center gap-3">
                      <input
                        id={id}
                        type="radio"
                        name={`display-${group.name}`}
                        checked={settings[group.name] === option.value}
                        onChange={() => choose(group.name, option.value)}
                        aria-describedby={group.hint ? `display-${group.name}-hint` : undefined}
                        className={RADIO}
                      />
                      <label htmlFor={id} className="font-bold">
                        {option.label}
                      </label>
                    </div>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>

        {saved && (
          <Notice tone="success" className="mt-6 animate-reveal">
            <p className="font-bold text-success">Display settings applied and saved on this device.</p>
          </Notice>
        )}

        {(user.role === 'candidate' || user.role === 'employer') && (
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="text-lg font-semibold">Get started card</h3>
            <p className="mt-1 text-sm text-muted">If you hid the Get started steps on your dashboard, you can bring them back.</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => {
                showGetStartedAgain()
                announce('The Get started card will show on your dashboard again.')
              }}
            >
              Show the Get started card again
            </Button>
          </div>
        )}
      </section>
      <TourEntry />
    </>
  )
}
