import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { AnnouncerContext } from '../ui/announcerContext.js'
import ResumeUpload from './ResumeUpload.jsx'

vi.mock('../../api/candidate.js', () => ({ getResumeFile: vi.fn() }))
const { getResumeFile } = await import('../../api/candidate.js')

const pdf = (size = 1000, name = 'cv.pdf', type = 'application/pdf') => {
  const file = new File(['%PDF'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('ResumeUpload', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the uploaded file with Open, Replace and Remove', async () => {
    const { container } = render(<ResumeUpload resume={{ name: 'Ana CV.pdf', uploaded_at: '2026-10-11T02:00:00+00:00' }} onUpload={vi.fn()} onRemove={vi.fn()} />)

    expect(screen.getByText('Ana CV.pdf')).toBeInTheDocument()
    expect(screen.getByText('Uploaded October 11, 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open my résumé (PDF, opens in a new tab)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace résumé' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove résumé' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('opens the PDF through the app, so the session goes with it', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    getResumeFile.mockResolvedValue(blob)
    const tab = { location: { href: '' }, opener: {}, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(tab)
    URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost:5173/abc')
    URL.revokeObjectURL = vi.fn()
    render(<ResumeUpload resume={{ name: 'cv.pdf', uploaded_at: '2026-10-11T02:00:00+00:00' }} onUpload={vi.fn()} onRemove={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Open my résumé/ }))

    // The tab opens during the click (pop-up blockers allow that), then shows the file.
    expect(window.open).toHaveBeenCalledWith('', '_blank')
    expect(getResumeFile).toHaveBeenCalled()
    await vi.waitFor(() => expect(tab.location.href).toBe('blob:http://localhost:5173/abc'))
    expect(tab.opener).toBeNull()
  })

  it('says when the PDF cannot be opened', async () => {
    getResumeFile.mockRejectedValue({ response: { status: 404, data: { message: "You haven't uploaded a résumé." } } })
    const tab = { location: { href: '' }, opener: {}, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(tab)
    render(<ResumeUpload resume={{ name: 'cv.pdf', uploaded_at: '2026-10-11T02:00:00+00:00' }} onUpload={vi.fn()} onRemove={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Open my résumé/ }))

    expect(await screen.findByText("You haven't uploaded a résumé.")).toBeInTheDocument()
    expect(tab.close).toHaveBeenCalled()
  })

  it('checks the file before uploading', async () => {
    const onUpload = vi.fn()
    render(<ResumeUpload resume={null} onUpload={onUpload} onRemove={vi.fn()} />)
    const input = screen.getByLabelText('PDF résumé')

    await userEvent.upload(input, pdf(1000, 'cv.txt', 'text/plain'), { applyAccept: false })
    await userEvent.click(screen.getByRole('button', { name: 'Upload résumé' }))
    expect(screen.getByText('The résumé must be a PDF file.')).toBeInTheDocument()

    await userEvent.upload(input, pdf(6 * 1024 * 1024))
    await userEvent.click(screen.getByRole('button', { name: 'Upload résumé' }))
    expect(screen.getByText('The résumé must be smaller than 5 MB.')).toBeInTheDocument()
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('accepts a PDF whose type the browser does not know', async () => {
    const onUpload = vi.fn().mockResolvedValue()
    render(<ResumeUpload resume={null} onUpload={onUpload} onRemove={vi.fn()} />)

    await userEvent.upload(screen.getByLabelText('PDF résumé'), pdf(1000, 'cv.pdf', ''))
    await userEvent.click(screen.getByRole('button', { name: 'Upload résumé' }))

    expect(onUpload).toHaveBeenCalled()
  })

  it('says when the résumé is uploaded or removed, and keeps focus in place', async () => {
    const announce = vi.fn()
    const { rerender } = render(
      <AnnouncerContext.Provider value={announce}>
        <ResumeUpload resume={null} onUpload={vi.fn().mockResolvedValue()} onRemove={vi.fn()} />
      </AnnouncerContext.Provider>,
    )
    await userEvent.upload(screen.getByLabelText('PDF résumé'), pdf())
    await userEvent.click(screen.getByRole('button', { name: 'Upload résumé' }))
    expect(announce).toHaveBeenCalledWith('Your résumé is uploaded.')

    const onRemove = vi.fn().mockResolvedValue()
    rerender(
      <AnnouncerContext.Provider value={announce}>
        <ResumeUpload resume={{ name: 'cv.pdf', uploaded_at: '2026-10-11T02:00:00+00:00' }} onUpload={vi.fn()} onRemove={onRemove} />
      </AnnouncerContext.Provider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove résumé' }))
    rerender(
      <AnnouncerContext.Provider value={announce}>
        <ResumeUpload resume={null} onUpload={vi.fn()} onRemove={onRemove} />
      </AnnouncerContext.Provider>,
    )
    expect(announce).toHaveBeenCalledWith('Your résumé is removed.')
    expect(screen.getByLabelText('PDF résumé')).toHaveFocus()
  })

  it('uploads a PDF and shows the server’s message if it is refused', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('The résumé must be a PDF file.'))
    render(<ResumeUpload resume={null} onUpload={onUpload} onRemove={vi.fn()} />)

    await userEvent.upload(screen.getByLabelText('PDF résumé'), pdf())
    await userEvent.click(screen.getByRole('button', { name: 'Upload résumé' }))

    expect(onUpload).toHaveBeenCalled()
    expect(await screen.findByText('The résumé must be a PDF file.')).toBeInTheDocument()
  })
})
