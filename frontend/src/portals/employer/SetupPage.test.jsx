import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { splitIndustry } from '../../lib/industry.js'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import EmployerProfileForm from './EmployerProfileForm.jsx'
import SetupPage from './SetupPage.jsx'

vi.mock('../../api/employer.js', () => ({ setupEmployer: vi.fn(), updateEmployerProfile: vi.fn() }))
vi.mock('../../api/masterData.js', () => ({ getCategories: vi.fn() }))

const { setupEmployer, updateEmployerProfile } = await import('../../api/employer.js')
const { getCategories } = await import('../../api/masterData.js')

const CATEGORIES = [
  { id: 1, name: 'Healthcare' },
  { id: 2, name: 'Information Technology' },
]

function renderSetup() {
  const refresh = vi.fn().mockResolvedValue(undefined)
  const rendered = renderRoutes(
    [
      { path: '/', element: <SetupPage /> },
      { path: '/employer/dashboard', element: <p>Dashboard</p> },
    ],
    { auth: { status: 'authenticated', role: 'employer', user: { name: 'Ana Reyes', role: 'employer' }, refresh } },
  )
  return rendered
}

async function fillCompany() {
  await userEvent.click(screen.getByRole('radio', { name: /A company or organization/ }))
  await userEvent.type(screen.getByLabelText('Company name'), 'Acme Corp.')
  await userEvent.type(screen.getByLabelText('Company address'), 'Makati City')
}

describe('SetupPage industry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCategories.mockResolvedValue(CATEGORIES)
    setupEmployer.mockResolvedValue({})
  })

  it('lets the person change the industry after choosing one', async () => {
    renderSetup()
    await fillCompany()
    const industry = screen.getByRole('combobox', { name: 'Industry' })
    await screen.findByRole('option', { name: 'Healthcare' })

    await userEvent.selectOptions(industry, 'Healthcare')
    expect(industry).toHaveValue('Healthcare')
    // The bug: with the old suggestion box only the chosen industry was offered again.
    expect(screen.getByRole('option', { name: 'Information Technology' })).toBeInTheDocument()
    await userEvent.selectOptions(industry, 'Information Technology')
    expect(industry).toHaveValue('Information Technology')

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(setupEmployer).toHaveBeenCalledWith({ type: 'company', name: 'Acme Corp.', industry: 'Information Technology', address: 'Makati City' })
  })

  it('saves the industry typed under Others', async () => {
    const { container } = renderSetup()
    await fillCompany()
    await screen.findByRole('option', { name: 'Healthcare' })
    expect(screen.queryByLabelText('Your industry')).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Industry' }), 'Others')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('link', { name: "Enter the company's industry." })).toHaveAttribute('href', '#industryOther')
    expect(setupEmployer).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Your industry'), '  Agriculture ')
    expect(await axe(container)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(setupEmployer).toHaveBeenCalledWith({ type: 'company', name: 'Acme Corp.', industry: 'Agriculture', address: 'Makati City' })
  })

  it('asks for an industry when none is chosen', async () => {
    renderSetup()
    await fillCompany()
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('link', { name: "Choose the company's industry." })).toHaveAttribute('href', '#industry')
  })
})

describe('EmployerProfileForm industry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCategories.mockResolvedValue(CATEGORIES)
  })

  it('shows an industry that is not on the list as Others, and saves a new choice', async () => {
    updateEmployerProfile.mockImplementation(async (values) => values)
    const onSaved = vi.fn()
    const employer = { type: 'company', name: 'Acme Corp.', industry: 'Agriculture', address: 'Makati City', description: '' }
    renderRoutes([{ path: '/', element: <EmployerProfileForm employer={employer} onSaved={onSaved} /> }])

    const industry = screen.getByRole('combobox', { name: 'Industry' })
    expect(await screen.findByLabelText('Your industry')).toHaveValue('Agriculture')
    expect(industry).toHaveValue('__other__')

    await userEvent.selectOptions(industry, 'Healthcare')
    expect(screen.queryByLabelText('Your industry')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }))
    expect(updateEmployerProfile).toHaveBeenCalledWith({ name: 'Acme Corp.', industry: 'Healthcare', address: 'Makati City', description: '' })
  })
})

describe('splitIndustry', () => {
  it('keeps a split industry as it is when called again', () => {
    const once = splitIndustry('Agriculture', CATEGORIES)
    expect(once).toEqual({ industry: '__other__', industryOther: 'Agriculture' })
    expect({ ...once, ...splitIndustry(once.industry, CATEGORIES) }).toEqual(once)
    expect(splitIndustry('Healthcare', CATEGORIES)).toEqual({ industry: 'Healthcare', industryOther: '' })
  })
})
