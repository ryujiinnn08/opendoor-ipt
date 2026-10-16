import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { searchJobs } from '../../api/jobs.js'
import HomeHero from '../../components/home/HomeHero.jsx'
import JobCard from '../../components/jobs/JobCard.jsx'
import Button from '../../components/ui/Button.jsx'
import FormField from '../../components/ui/FormField.jsx'
import Notice from '../../components/ui/Notice.jsx'
import VerificationResult from '../../components/verification/VerificationResult.jsx'
import { TEXT_LINK } from '../../components/ui/buttonLinkStyles.js'

const STEPS = [
  {
    title: 'Tell us what you need, once',
    text: 'Choose the workplace accommodations you need, such as a wheelchair-accessible entrance, a sign language interpreter or remote work.',
  },
  {
    title: 'See jobs that meet your needs',
    text: 'Job postings list the accommodations they provide, so you can see how many of your needs each job meets before you apply.',
  },
  {
    title: 'Know which employers keep their word',
    text: 'People who were hired confirm whether each promised accommodation was delivered. Their answers stay anonymous.',
  },
]

export default function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [featured, setFeatured] = useState(null)

  // The newest three open jobs. If they can't load, Home simply leaves the section out.
  useEffect(() => {
    let active = true
    searchJobs({ sort: 'newest', perPage: 3 })
      .then(({ jobs }) => active && setFeatured(jobs))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  function startSearch(event) {
    event.preventDefault()
    const words = search.trim()
    navigate(words ? `/jobs?${new URLSearchParams({ q: words })}` : '/jobs')
  }

  return (
    <>
      <VerificationResult />
      {location.state?.loggedOut && (
        <Notice tone="success" className="mb-8">
          You have logged out.
        </Notice>
      )}

      <HomeHero />

      <section aria-labelledby="home-search-title" className="mt-14 rounded-lg border-2 border-border bg-subtle p-5 sm:p-6">
        <h2 id="home-search-title" className="text-2xl font-semibold">
          Search open jobs
        </h2>
        <form role="search" onSubmit={startSearch} className="mt-4 flex max-w-2xl flex-wrap items-end gap-3">
          <FormField
            id="home-search"
            label="Search jobs"
            hint="Job title, skill, company or place"
            type="search"
            maxLength={100}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mb-0 min-w-0 flex-1 basis-64"
            inputClassName="w-full"
          />
          <Button type="submit">Search</Button>
        </form>
      </section>

      {featured?.length > 0 && (
        <section aria-labelledby="open-jobs" className="mt-12">
          <h2 id="open-jobs" className="text-2xl font-bold">
            Open jobs
          </h2>
          <ul className="mt-4 space-y-4">
            {featured.map((job) => (
              <JobCard key={job.id} job={job} to={`/jobs/${job.id}`} />
            ))}
          </ul>
          <p className="mt-4">
            <Link to="/jobs" className={TEXT_LINK}>
              Browse all jobs
            </Link>
          </p>
        </section>
      )}

      <section aria-labelledby="how-it-works" className="mt-12">
        <h2 id="how-it-works" className="text-2xl font-bold">
          How OpenDoor works
        </h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-lg border border-border bg-surface p-5">
              <p className="font-bold text-primary">Step {index + 1}</p>
              <h3 className="mt-1 text-xl font-bold">{step.title}</h3>
              <p className="mt-2">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
