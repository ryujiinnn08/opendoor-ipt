// Each notification as one sentence with a link (plan PHASE_6 §4.4), from what the server
// recorded. `role` is the reader's: a status change reads differently for each side.

/** Ends with one full stop, even after a name like "OpenDoor Demo Corp." */
const sentence = (text) => (text.endsWith('.') ? text : `${text}.`)

const FOR_JOB_SEEKER = {
  reviewed: ({ employer_name, job_title }) => sentence(`${employer_name} opened your application for ${job_title}`),
  hired: ({ employer_name, job_title }) => sentence(`You were hired for ${job_title} at ${employer_name}`),
  rejected: ({ employer_name, job_title }) => sentence(`${employer_name} chose other applicants for ${job_title}`),
}

const FOR_EMPLOYER = {
  hired: ({ applicant_name, job_title }) => sentence(`${applicant_name} confirmed they were hired for ${job_title}`),
  withdrawn: ({ applicant_name, job_title }) => sentence(`${applicant_name} withdrew their application for ${job_title}`),
}

/** { text, to } for one notification. */
export function notificationText({ type, details }, role) {
  switch (type) {
    case 'new_applicant':
      return {
        text: sentence(`${details.applicant_name} applied for ${details.job_title}`),
        to: `/employer/applications/${details.application_id}`,
      }
    case 'status_changed': {
      const sentences = role === 'candidate' ? FOR_JOB_SEEKER : FOR_EMPLOYER
      const wording = sentences[details.status]
      return {
        text: wording ? wording(details) : sentence(`An application for ${details.job_title} changed`),
        to: `/${role}/applications/${details.application_id}`,
      }
    }
    case 'feedback_open':
      return {
        text: sentence(`You can now rate the accommodations ${details.employer_name} promised for ${details.job_title}`),
        to: `/candidate/applications/${details.application_id}/feedback`,
      }
    case 'verification_decided':
      return details.verified
        ? { text: sentence(`${details.employer_name} is now verified`), to: '/employer/company' }
        : { text: `${details.employer_name} wasn't verified. See what to fix.`, to: '/employer/company' }
    case 'posting_decided':
      return details.approved
        ? { text: sentence(`${details.job_title} was approved`), to: `/employer/job-postings/${details.job_posting_id}` }
        : { text: `${details.job_title} was rejected. See what to fix.`, to: `/employer/job-postings/${details.job_posting_id}` }
    case 'posting_removed':
      return { text: `OpenDoor removed ${details.job_title}. See why.`, to: '/employer/job-postings?status=removed' }
    default:
      return { text: 'Something changed on your account.', to: `/${role}/dashboard` }
  }
}

export const EMPTY_NOTIFICATIONS = {
  candidate: "No notifications yet. We'll tell you here when something changes on your applications.",
  employer: "No notifications yet. We'll tell you here when something changes on your job postings.",
}
