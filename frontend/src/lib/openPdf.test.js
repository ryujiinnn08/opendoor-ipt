import { afterEach, describe, expect, it, vi } from 'vitest'
import { openPdfInNewTab } from './openPdf.js'

describe('openPdfInNewTab', () => {
  afterEach(() => vi.restoreAllMocks())

  it('always opens the file as a PDF, whatever type it arrived with', async () => {
    const tab = { opener: 'x', location: { href: '' }, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(tab)
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()

    await openPdfInNewTab(async () => new Blob(['<script>alert(1)</script>'], { type: 'text/html' }))

    const blob = URL.createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('application/pdf')
    expect(tab.location.href).toBe('blob:x')
    expect(tab.opener).toBeNull()
  })
})
