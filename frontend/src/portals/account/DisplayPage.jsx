import { useState } from 'react'
import { useAuth } from '../../auth/authContext.js'
import { employerSummary } from '../../auth/employerAccess.js'
import { useAnnounce } from '../../components/ui/announcerContext.js'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import PageTabs from '../../components/ui/PageTabs.jsx'
import { ACCOUNT_TABS } from '../../lib/sectionTabs.js'
import { RADIO } from '../../components/ui/fieldStyles.js'
import { useDisplaySettings } from '../../display/displayContext.js'
import { TEXT_SIZES } from '../../display/displaySettings.js'

const GROUPS = [
  { name: 'text', legend: 'Text size', options: TEXT_SIZES },
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

        <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((group) => (
            <fieldset key={group.name}>
              <legend className="text-lg font-semibold">{group.legend}</legend>
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
          <Notice tone="success" className="mt-6">
            <p className="font-bold text-success">Display settings applied and saved on this device.</p>
          </Notice>
        )}
      </section>
    </>
  )
}
