import { describe, expect, it } from 'vitest'
import { notificationText } from './notificationText.js'

const application = { application_id: 9, job_title: 'Graphic Designer', employer_name: 'OpenDoor Demo Corp.', applicant_name: 'Maria Santos' }

describe('notificationText', () => {
  it('tells employers who applied, linking to the applicant', () => {
    expect(notificationText({ type: 'new_applicant', details: application }, 'employer')).toEqual({
      text: 'Maria Santos applied for Graphic Designer.',
      to: '/employer/applications/9',
    })
  })

  it('words a status change for the side reading it', () => {
    const hired = { type: 'status_changed', details: { ...application, status: 'hired' } }
    expect(notificationText(hired, 'candidate')).toEqual({
      text: 'You were hired for Graphic Designer at OpenDoor Demo Corp.',
      to: '/candidate/applications/9',
    })
    expect(notificationText(hired, 'employer').text).toBe('Maria Santos confirmed they were hired for Graphic Designer.')
  })

  it('links a removal to the Removed list and a rejection to the posting', () => {
    expect(notificationText({ type: 'posting_removed', details: { job_posting_id: 3, job_title: 'Junior Web Developer' } }, 'employer')).toEqual({
      text: 'OpenDoor removed Junior Web Developer. See why.',
      to: '/employer/job-postings?status=removed',
    })
    expect(notificationText({ type: 'posting_decided', details: { job_posting_id: 3, job_title: 'Clerk', approved: false } }, 'employer')).toEqual({
      text: 'Clerk was rejected. See what to fix.',
      to: '/employer/job-postings/3',
    })
  })

  it('never shows an empty sentence for something unknown', () => {
    expect(notificationText({ type: 'mystery', details: {} }, 'candidate')).toEqual({
      text: 'Something changed on your account.',
      to: '/candidate/dashboard',
    })
  })
})
