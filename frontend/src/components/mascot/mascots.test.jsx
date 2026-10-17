import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { DisplayContext } from '../../display/displayContext.js'
import { DEFAULTS } from '../../display/displaySettings.js'
import MascotDoor from './MascotDoor.jsx'
import MascotHappy from './MascotHappy.jsx'
import MascotLoader from './MascotLoader.jsx'
import MascotMessage from './MascotMessage.jsx'
import MascotSad from './MascotSad.jsx'

const still = ({ children }) => <DisplayContext.Provider value={{ settings: { ...DEFAULTS, motion: 'reduce' }, update: () => {} }}>{children}</DisplayContext.Provider>

describe('the mascot animations', () => {
  it.each([
    ['sad', MascotSad],
    ['happy', MascotHappy],
    ['door', MascotDoor],
    ['loader', MascotLoader],
  ])('draws the %s mascot as decoration, hidden from screen readers', (_, Mascot) => {
    const { container } = render(<Mascot />, { wrapper: still })
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    // With Reduce motion it is drawn once, still: its parts already have their pose.
    expect(svg.querySelector('[transform]')).not.toBeNull()
  })

  it('gives two mascots on one page their own ids, so masks and filters never clash', () => {
    const { container } = render(
      <>
        <MascotSad />
        <MascotSad />
      </>,
      { wrapper: still },
    )
    const masks = [...container.querySelectorAll('mask')].map((mask) => mask.id)
    expect(new Set(masks).size).toBe(2)
  })
})

describe('MascotMessage', () => {
  it('says the message in words, with the mascot beside it as decoration', async () => {
    const { container } = render(
      <MascotMessage mood="happy" title="Application sent!" headingId="sent-heading">
        <p>Your application was sent to Acme Corp.</p>
      </MascotMessage>,
      { wrapper: still },
    )
    expect(screen.getByRole('region', { name: 'Application sent!' })).toHaveTextContent('Your application was sent to Acme Corp.')
    expect(await axe(container)).toHaveNoViolations()
  })
})
