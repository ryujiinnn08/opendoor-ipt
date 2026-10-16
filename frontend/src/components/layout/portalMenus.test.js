import { describe, expect, it } from 'vitest'
import { GUEST_MENU, isCurrent, portalFor } from './portalMenus.js'

const labels = (user) => {
  const { left, right } = portalFor(user)
  return [left.map((item) => item.label), right.map((item) => item.label)]
}
const company = { type: 'company', name: 'Acme Corp.' }

describe('portalFor', () => {
  it('gives each kind of employer its own menu', () => {
    expect(labels({ role: 'employer', membership: { role: 'owner', employer: company } })).toEqual([
      ['Dashboard', 'Job postings', 'Company', 'Team', 'Trust score'],
      [],
    ])
    expect(labels({ role: 'employer', membership: { role: 'hr', employer: company, department: { name: 'IT' } } })).toEqual([
      ['Dashboard', 'Job postings', 'Trust score'],
      [],
    ])
    expect(labels({ role: 'employer', membership: { role: 'owner', employer: { type: 'individual' } } })).toEqual([
      ['Dashboard', 'Job postings', 'My profile', 'Trust score'],
      [],
    ])
    expect(labels({ role: 'employer', membership: null })).toEqual([['Set up your profile'], []])
  })

  it('gives job seekers their pages, with Profile on the right', () => {
    expect(labels({ role: 'candidate' })).toEqual([['Dashboard', 'Find jobs', 'Applications'], ['Profile']])
  })

  it('gives administrators their queues, with Feedback and Data on the right', () => {
    expect(labels({ role: 'admin' })).toEqual([
      ['Dashboard', 'Employers', 'Postings', 'Users'],
      ['Feedback', 'Data'],
    ])
  })

  it('gives every item an icon for the compact menu', () => {
    const users = [{ role: 'candidate' }, { role: 'admin' }, { role: 'employer', membership: { role: 'owner', employer: company } }]
    const items = [...GUEST_MENU, ...users.flatMap((user) => [...portalFor(user).left, ...portalFor(user).right])]
    expect(items.filter((item) => !item.icon)).toEqual([])
  })
})

describe('isCurrent', () => {
  const profile = portalFor({ role: 'candidate' }).right[0]
  const findJobs = GUEST_MENU[1]

  it('marks a page, its sub-pages and its tabs', () => {
    expect(isCurrent(profile, '/candidate/needs')).toBe(true)
    expect(isCurrent(profile, '/candidate/profile/resume')).toBe(true)
    expect(isCurrent(findJobs, '/jobs/2')).toBe(true)
    expect(isCurrent(findJobs, '/employers/4')).toBe(true)
  })

  it('does not mark look-alike addresses', () => {
    expect(isCurrent(GUEST_MENU[0], '/jobs')).toBe(false)
    expect(isCurrent(profile, '/candidate/needsx')).toBe(false)
    expect(isCurrent({ to: '/admin/users' }, '/admin/users/3')).toBe(false)
  })
})
