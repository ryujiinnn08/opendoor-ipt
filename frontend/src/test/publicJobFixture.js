/**
 * One open job in the public API shape (PublicJobPostingResource), shared by component and page tests.
 */
export const publicJobFixture = {
  id: 2,
  title: 'Junior Web Developer',
  description: 'Build and maintain accessible web pages for our clients.\nA senior developer reviews your work every week.',
  location: 'Anywhere in the Philippines',
  employment_type: 'full_time',
  work_setup: 'remote',
  interview_format: 'online',
  closes_on: '2026-11-30',
  category: { id: 1, name: 'Information Technology' },
  department: { name: 'IT' },
  employer: { id: 1, type: 'company', name: 'Acme Corp.', logo_url: null, is_verified: true },
  accommodations: [
    { id: 10, name: 'Remote work', group_name: 'Work arrangement', note: 'Laptop and internet allowance provided.' },
    { id: 11, name: 'Flexible hours', group_name: 'Work arrangement', note: null },
    { id: 12, name: 'Screen reader software provided', group_name: 'Assistive technology', note: 'NVDA is installed on the company laptop.' },
    { id: 13, name: 'Written or captioned meetings', group_name: 'Communication', note: null },
  ],
}

export default publicJobFixture
