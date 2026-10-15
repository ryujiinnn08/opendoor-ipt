import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import PortalLayout from '../../components/layout/PortalLayout.jsx'
import { renderRoutes } from '../../test/renderWithProviders.jsx'
import NotificationsPage from './NotificationsPage.jsx'

vi.mock('../../api/notifications.js', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}))

const { getNotifications, getUnreadCount, markRead, markAllRead } = await import('../../api/notifications.js')

const routes = [
  {
    element: <PortalLayout />,
    children: [
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/employer/applications/:id', element: <p>Applicant page</p> },
    ],
  },
]
const company = { id: 1, type: 'company', name: 'OpenDoor Demo Corp.' }
const employer = {
  status: 'authenticated',
  role: 'employer',
  user: { name: 'Demo Employer', role: 'employer', membership: { role: 'owner', employer: company, department: null } },
}
const unread = {
  id: 'a1',
  type: 'new_applicant',
  details: { application_id: 7, job_title: 'Junior Web Developer', applicant_name: 'Maria Santos' },
  read_at: null,
  created_at: '2026-10-16T09:00:00+08:00',
}
const read = {
  id: 'b2',
  type: 'posting_removed',
  details: { job_posting_id: 3, job_title: 'Office Clerk' },
  read_at: '2026-10-16T10:00:00+08:00',
  created_at: '2026-10-15T09:00:00+08:00',
}
const page = (data) => ({ data, meta: { current_page: 1, last_page: 1, total: data.length } })

describe('NotificationsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows "Notifications (1)" in the header and each notification as a linked sentence', async () => {
    getUnreadCount.mockResolvedValue(1)
    getNotifications.mockResolvedValue(page([unread, read]))
    const { container } = renderRoutes(routes, { path: '/notifications', auth: employer })

    const link = await screen.findByRole('link', { name: /^Notifications/ })
    expect(link).toHaveAttribute('href', '/notifications')
    await vi.waitFor(() => expect(link).toHaveTextContent('Notifications (1 unread)'))
    const newItem = (await screen.findByRole('link', { name: 'Maria Santos applied for Junior Web Developer.' })).closest('li')
    expect(within(newItem).getByText('New')).toBeInTheDocument()
    const oldItem = screen.getByRole('link', { name: 'OpenDoor removed Office Clerk. See why.' }).closest('li')
    expect(within(oldItem).queryByText('New')).not.toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('opening one marks it read and updates the count', async () => {
    getUnreadCount.mockResolvedValueOnce(1).mockResolvedValue(0)
    getNotifications.mockResolvedValue(page([unread]))
    markRead.mockResolvedValue({ ...unread, read_at: '2026-10-16T11:00:00+08:00' })
    renderRoutes(routes, { path: '/notifications', auth: employer })

    await userEvent.click(await screen.findByRole('link', { name: 'Maria Santos applied for Junior Web Developer.' }))

    expect(markRead).toHaveBeenCalledWith('a1')
    expect(await screen.findByText('Applicant page')).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.getByRole('link', { name: /^Notifications/ })).toHaveTextContent(/^Notifications$/))
  })

  it('marks all as read', async () => {
    getUnreadCount.mockResolvedValue(1)
    getNotifications.mockResolvedValue(page([unread]))
    markAllRead.mockResolvedValue()
    const announce = vi.fn()
    renderRoutes(routes, { path: '/notifications', auth: employer, announce })

    await userEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }))

    expect(markAllRead).toHaveBeenCalled()
    expect(screen.queryByText('New')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument()
    expect(announce).toHaveBeenCalledWith('All notifications are marked as read.')
  })

  it('says what will appear when there is nothing yet', async () => {
    getUnreadCount.mockResolvedValue(0)
    getNotifications.mockResolvedValue(page([]))
    renderRoutes(routes, { path: '/notifications', auth: employer })

    expect(
      await screen.findByText("No notifications yet. We'll tell you here when something changes on your job postings."),
    ).toBeInTheDocument()
  })

  it('gives administrators no notifications link', async () => {
    renderRoutes([{ element: <PortalLayout />, children: [{ path: '/admin/dashboard', element: <p>Admin home</p> }] }], {
      path: '/admin/dashboard',
      auth: { status: 'authenticated', role: 'admin', user: { name: 'Admin', role: 'admin' } },
    })

    await screen.findByText('Admin home')
    expect(screen.queryByRole('link', { name: /Notifications/ })).not.toBeInTheDocument()
    expect(getUnreadCount).not.toHaveBeenCalled()
  })
})
