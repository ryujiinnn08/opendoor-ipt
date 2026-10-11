import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import EntryList from './EntryList.jsx'

let nextKey = 0
const entry = (title) => ({ _key: `k${nextKey++}`, title })

function Harness({ initial = [] }) {
  const [items, setItems] = useState(initial)
  return (
    <EntryList
      id="jobs"
      legend="Work experience"
      itemLabel="Work experience"
      addLabel="Add work experience"
      items={items}
      onChange={setItems}
      newItem={() => entry('')}
      firstFieldId={(index) => `jobs-${index}-title`}
      renderFields={(item, index, change) => (
        <>
          <label htmlFor={`jobs-${index}-title`}>Job title</label>
          <input id={`jobs-${index}-title`} value={item.title} onChange={(event) => change('title', event.target.value)} />
        </>
      )}
    />
  )
}

describe('EntryList', () => {
  it('labels each entry with its place in the list', async () => {
    const { container } = render(<Harness initial={[entry('Clerk'), entry('Encoder')]} />)

    expect(screen.getByRole('group', { name: 'Work experience 1 of 2' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Work experience 2 of 2' })).getByLabelText('Job title')).toHaveValue('Encoder')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('adds an entry and moves focus to its first field', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'Add work experience' }))

    expect(screen.getByRole('group', { name: 'Work experience 1 of 1' })).toBeInTheDocument()
    expect(screen.getByLabelText('Job title')).toHaveFocus()
  })

  it('removes an entry and moves focus to the next one', async () => {
    render(<Harness initial={[entry('Clerk'), entry('Encoder')]} />)

    await userEvent.click(screen.getByRole('button', { name: 'Remove work experience 1' }))

    const remaining = screen.getByRole('group', { name: 'Work experience 1 of 1' })
    expect(within(remaining).getByLabelText('Job title')).toHaveValue('Encoder')
    expect(remaining).toHaveFocus()
  })

  it('moves focus to Add after removing the last entry', async () => {
    render(<Harness initial={[entry('Clerk')]} />)

    await userEvent.click(screen.getByRole('button', { name: 'Remove work experience 1' }))

    expect(screen.getByRole('button', { name: 'Add work experience' })).toHaveFocus()
  })

  it('stops at ten entries', () => {
    render(<Harness initial={Array.from({ length: 10 }, () => entry('Clerk'))} />)

    expect(screen.queryByRole('button', { name: 'Add work experience' })).not.toBeInTheDocument()
    expect(screen.getByText('You can add up to 10.')).toBeInTheDocument()
  })
})
