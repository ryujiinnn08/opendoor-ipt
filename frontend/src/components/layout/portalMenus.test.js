import { describe, expect, it } from 'vitest'
import { accountMenuFor, GUEST_MENU, isCurrent, PROFILE_ITEM, portalFor } from './portalMenus.js'

const labels = (user) => portalFor(user).left.map((item) => item.label)
const company = { type: 'company', name: 'Acme Corp.' }

describe('portalFor', () => {
  it('gives each kind of employer its own menu', () => {
    expect(labels({ role: 'employer', membership: { role: 'owner', employer: company } })).toEqual([
      'Dashboard', 'Job postings', 'Company', 'Team', 'Trust score',
    ])
    expect(labels({ role: 'employer', membership: { role: 'hr', employer: company, department: { name: 'IT' } } })).toEqual([
      'Dashboard', 'Job postings', 'Trust score',
    ])
    expect(labels({ role: 'employer', membership: { role: 'owner', employer: { type: 'individual' } } })).toEqual([
      'Dashboard', 'Job postings', 'My profile', 'Trust score',
    ])
    expect(labels({ role: 'employer', membership: null })).toEqual(['Set up your profile'])
  })

  it('gives job seekers their pages, and Profile in the account menu', () => {
    expect(labels({ role: 'candidate' })).toEqual(['Dashboard', 'Find jobs', 'Applications'])
    expect(accountMenuFor({ role: 'candidate' }).map((item) => item.label)).toEqual(['Profile', 'Display settings', 'Change password', 'Help and contact'])
    expect(accountMenuFor({ role: 'admin' }).map((item) => item.label)).toEqual(['Display settings', 'Change password', 'Help and contact'])
  })

  it('gives administrators their queues, Feedback and Data', () => {
    expect(labels({ role: 'admin' })).toEqual(['Dashboard', 'Employers', 'Postings', 'Users', 'Feedback', 'Data'])
  })

  it('gives every item an icon for the compact menu', () => {
    const users = [{ role: 'candidate' }, { role: 'admin' }, { role: 'employer', membership: { role: 'owner', employer: company } }]
    const items = [...GUEST_MENU, ...users.flatMap((user) => [...portalFor(user).left, ...accountMenuFor(user)])]
    expect(items.filter((item) => !item.icon)).toEqual([])
  })
})

describe('isCurrent', () => {
  const profile = PROFILE_ITEM
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
