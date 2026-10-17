import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { generalErrorFrom } from '../../api/client.js'
import { getProfile } from '../../api/candidate.js'
import ResumeView from '../../components/candidate/ResumeView.jsx'
import Button from '../../components/ui/Button.jsx'
import LoadingMessage from '../../components/ui/LoadingMessage.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { SECONDARY_LINK } from '../../components/ui/buttonLinkStyles.js'
import PageTabs from '../../components/ui/PageTabs.jsx'
import { PROFILE_TABS } from '../../lib/sectionTabs.js'

/**
 * My résumé (plan PHASE_3 §6.3): the profile as a résumé, printable or saved as a PDF from the
 * browser. Print styles hide the portal's header, menu, footer and these buttons.
 */
export default function ResumePage() {
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getProfile()
      .then((loaded) => active && setProfile(loaded))
      .catch((error) => active && setLoadError(generalErrorFrom(error) ?? 'Something went wrong. Please try again.'))
    return () => {
      active = false
    }
  }, [attempt])

  return (
    <>
      <PageHeader
        title={profile?.name ?? 'My résumé'}
        documentTitle="My résumé"
        intro={
          <span className="print:hidden">
            Don&apos;t have a résumé yet? OpenDoor builds this one from your profile, and it updates when you change your profile. You can
            also upload your own on My profile. This is how it looks to employers.
          </span>
        }
        tabs={<PageTabs label="Profile" items={PROFILE_TABS} className="mt-6 print:hidden" />}
        actions={
          profile && (
            <div className="flex flex-wrap gap-3 print:hidden">
              <Button onClick={() => window.print()}>Print or save as PDF</Button>
              <Link to="/candidate/profile" className={SECONDARY_LINK}>
                Edit my profile
              </Link>
            </div>
          )
        }
      />

      {loadError && (
        <Notice tone="error" className="mt-6">
          <p>{loadError}</p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setLoadError(null)
              setAttempt((count) => count + 1)
            }}
          >
            Try again
          </Button>
        </Notice>
      )}
      {!profile && !loadError && <LoadingMessage>Loading your résumé…</LoadingMessage>}
      {profile && <ResumeView profile={profile} />}
    </>
  )
}
