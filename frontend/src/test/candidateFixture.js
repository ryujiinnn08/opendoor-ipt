/**
 * A job seeker's own profile and needs in the API shapes (CandidateProfileResource and
 * GET /api/candidate/accommodations), shared by component and page tests.
 */
export const profileFixture = {
  name: 'Ana Reyes',
  email: 'ana@example.com',
  headline: 'Data encoder with 2 years of experience',
  city: 'Quezon City',
  province: 'Metro Manila',
  contact_number: '0917 555 0101',
  about: 'I enter and check records carefully.',
  skills: 'Microsoft Excel, data entry',
  trainings: 'TESDA Bookkeeping NC III, 2024',
  languages: 'Filipino, English',
  disability_type: 'physical',
  show_disability: false,
  experiences: [
    { job_title: 'Data Encoder', company: 'Bayani Logistics', started_on: '2023-01', ended_on: '2024-12', is_current: false, description: 'Encoded delivery records.' },
  ],
  educations: [{ level: 'college', school: 'Technological University of the Philippines', course: 'BS Information Technology', year_finished: 2022, is_studying: false }],
  resume: null,
}

export const needsFixture = [
  { id: 1, name: 'Wheelchair-accessible entrance', group_name: 'Physical access', is_active: true },
  { id: 2, name: 'Accessible restroom', group_name: 'Physical access', is_active: true },
  { id: 9, name: 'Braille signage', group_name: 'Physical access', is_active: false },
]
