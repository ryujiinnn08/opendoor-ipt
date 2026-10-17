import { Link } from 'react-router-dom'
import IconTile from '../../components/ui/IconTile.jsx'
import Notice from '../../components/ui/Notice.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'

const GUIDES = [
  {
    id: 'job-seekers',
    title: 'For job seekers',
    icon: 'search',
    tone: 'sky',
    steps: [
      ['Tell us what you need.', 'Tick the accommodations you need at work, such as a ramp, a screen reader or flexible hours. Only employers you apply to see them.'],
      ['Fill in your profile.', 'Your headline, education and skills, and a PDF résumé if you have one. Choose what kind of work you are open to.'],
      ['Find jobs that fit.', 'Find jobs puts the jobs that meet the most of your needs first and shows what each one provides.'],
      ['Apply and follow along.', 'My applications shows where each one stands and what happens next.'],
      ['Rate the accommodations.', 'About 30 days after you are hired, we ask whether each promised accommodation was provided.'],
    ],
  },
  {
    id: 'employers',
    title: 'For employers',
    icon: 'building',
    tone: 'orange',
    steps: [
      ['Set up your company.', 'Add your profile and send your business registration so job seekers see that you are verified.'],
      ['Post a job.', 'List only the accommodations you really provide. An OpenDoor administrator checks each posting before it goes live.'],
      ['Review applicants.', 'See each applicant’s profile, résumé and needs, and how your posting meets them. Mark them as hired or not selected.'],
      ['Build your trust score.', 'The people you hire rate whether the accommodations were delivered.'],
    ],
  },
  {
    id: 'trust-score',
    title: 'How the trust score works',
    icon: 'shield-check',
    tone: 'lilac',
    steps: [
      ['Hired employees rate each accommodation.', 'Delivered, partly delivered or not delivered.'],
      ['The score is the share that was delivered.', 'Shown as a whole percentage on job cards, job pages and the employer’s page.'],
      ['It appears after 3 responses.', 'Until then it says “Not rated yet”, so no single rating can be traced back to a person.'],
    ],
  },
]

/**
 * /help, "How OpenDoor works" (UI_FEEDBACK_WAVE_B_PLAN B4): short numbered steps for job seekers,
 * employers and the trust score. Linked from the footer, the account menu and Get started. Plain
 * page content instead of a pop-up tour.
 */
export default function HelpPage() {
  return (
    <>
      <PageHeader title="How OpenDoor works" intro="OpenDoor matches persons with disabilities with jobs that provide the accommodations they need." />
      <Notice tone="info" className="mt-6">
        Draft for review by the OpenDoor project team.
      </Notice>

      <nav aria-label="On this page" className="mt-6">
        <ul className="flex flex-wrap gap-x-6">
          {GUIDES.map((guide) => (
            <li key={guide.id}>
              <a href={`#${guide.id}`} className={TEXT_LINK}>
                {guide.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        {GUIDES.map((guide) => (
          <section key={guide.id} id={guide.id} aria-labelledby={`${guide.id}-heading`} className="rounded-lg border border-border bg-surface p-5 sm:p-6">
            <IconTile icon={guide.icon} tone={guide.tone} />
            <h2 id={`${guide.id}-heading`} className="mt-3 text-2xl font-bold">
              {guide.title}
            </h2>
            <ol className="mt-4 space-y-4">
              {guide.steps.map(([step, detail], index) => (
                <li key={step} className="flex gap-3">
                  <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-yellow text-sm font-bold text-text">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-bold">{step}</span>
                    <span className="block text-muted">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <p className="mt-8">
        Still have a question?{' '}
        <Link to="/contact" className={TEXT_LINK}>
          Contact us
        </Link>
      </p>
    </>
  )
}
