import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { profileFixture } from '../../test/candidateFixture.js'
import ResumeView from './ResumeView.jsx'

describe('ResumeView', () => {
  it('lays the profile out as a résumé', async () => {
    const { container } = render(<ResumeView profile={profileFixture} />)

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'About',
      'Work experience',
      'Education',
      'Skills',
      'Trainings and certifications',
      'Languages',
    ])
    expect(screen.getByText('Data encoder with 2 years of experience')).toBeInTheDocument()
    expect(screen.getByText('Quezon City, Metro Manila')).toBeInTheDocument()
    expect(screen.getByText('0917 555 0101')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Data Encoder' })).toBeInTheDocument()
    expect(screen.getByText('January 2023 to December 2024')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'College' })).toBeInTheDocument()
    expect(screen.getByText('Finished 2022')).toBeInTheDocument()
    expect(screen.queryByText(/Physical/)).not.toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows the current job, studies in progress and the disability type when allowed', () => {
    render(
      <ResumeView
        profile={{
          ...profileFixture,
          show_disability: true,
          experiences: [{ ...profileFixture.experiences[0], started_on: '2023-06', ended_on: null, is_current: true }],
          educations: [{ ...profileFixture.educations[0], year_finished: null, is_studying: true }],
        }}
      />,
    )

    expect(screen.getByText('June 2023 to now')).toBeInTheDocument()
    expect(screen.getByText('Still studying')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Disability type' })).toBeInTheDocument()
    expect(screen.getByText('Physical (orthopedic)')).toBeInTheDocument()
  })

  it('leaves out empty sections', () => {
    render(<ResumeView profile={{ ...profileFixture, about: null, skills: null, trainings: null, languages: null, experiences: [] }} />)

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Education'])
  })
})
