const step = (id, title, text, route, target, extra = {}) => ({ id, title, text, route, target, ...extra })
const dashboard = '/candidate/dashboard'
const jobs = '/candidate/jobs'
const applications = '/candidate/applications'
const profile = '/candidate/profile'
const page = 'page-content'
export const chapters = [
  { id: 'intro', title: 'Quick introduction', steps: [
    step('comfort', 'Make OpenDoor comfortable', 'Use Text size, High contrast, or Quiet mode to make the page easier to use. You can change these whenever you need.', dashboard, 'display-controls'),
    step('dashboard', 'Your starting point', 'Your dashboard brings together setup steps, applications, and jobs matching your accommodation needs. The Get started checklist tracks real actions, separately from this tour.', dashboard, 'dashboard-content'),
    step('profile', 'Your profile starts here', 'Open Account to find Profile, display settings, and help. Profile contains your needs, details, and résumé.', dashboard, ['account-menu', 'compact-menu'], { compactText: 'Open Menu to find Profile, display settings, and help. Profile contains your needs, details, and résumé.' }),
    step('jobs', 'Find jobs that interest you', 'Search for a role and compare the accommodations each job offers. You can use filters or browse all available jobs.', jobs, 'job-search'),
    step('applications', 'Follow your applications', 'After you apply, check your status and available next steps here. An empty list simply means you have not applied yet.', applications, page),
    step('help', 'Stay informed and get help', 'Notifications shows updates about your applications. Account also has display settings, How OpenDoor works, and Contact us.', applications, ['nav-/notifications', 'compact-menu'], { compactText: 'Menu has Notifications for updates about your applications, plus display settings, How OpenDoor works, and Contact us.' }),
  ] },
  { id: 'display', title: 'Display and navigation', steps: [
    step('controls', 'Choose comfortable settings', 'Adjust text size, contrast, motion, and decoration here. Your choices stay in effect after the tour. No change is required.', '/account/display', page),
    step('navigation', 'Move around OpenDoor', 'Dashboard, Find jobs, and Applications are your main destinations. Account holds your profile and settings. Menu brings these together on smaller screens.', '/account/display', ['site-navigation']),
  ] },
  { id: 'dashboard', title: 'Dashboard', steps: [
    step('overview', 'Your starting point', 'Review your profile summary and Get started checklist. Viewing a tour does not complete your profile or apply for a job.', dashboard, 'dashboard-content'),
    step('matches', 'Your next steps', 'Your dashboard shows application activity and, after you add needs, top matching jobs. If there are no matches, you can still browse all jobs.', dashboard, 'dashboard-content'),
  ] },
  { id: 'email', title: 'Confirm your email', steps: [
    step('confirmation', 'Check your inbox', 'Use the confirmation link sent when you registered. If your email is already confirmed, no further action is needed. You can explore OpenDoor while waiting.', dashboard, ['email-verification', 'dashboard-content']),
    step('resend', 'Need another email?', 'If a confirmation notice is shown, use its resend option when needed. The tour never sends email automatically. Applying still follows the normal confirmation checks.', dashboard, ['email-verification', 'dashboard-content']),
  ] },
  { id: 'needs', title: 'My accommodation needs', steps: [
    step('choose', 'Choose the support you need', 'Select only accommodations that apply to you. OpenDoor uses these choices to rank jobs by the support they list. You can continue this tour without choosing anything.', '/candidate/needs', 'candidate-needs'),
    step('save', 'Save when you are ready', 'Your needs are private until you apply to an employer’s job. Use Save my needs to save real changes; Next only advances this guide.', '/candidate/needs', 'candidate-needs'),
  ] },
  { id: 'profile', title: 'Your profile', steps: [
    step('basics', 'Introduce yourself', 'Add a headline, location, contact details, and an optional photo. Check the visibility choices on the form before sharing personal details.', profile, 'profile-basic'),
    step('experience', 'Show what you bring', 'Use the work experience, education, and skills sections to describe your background. Work preferences can help set filters when you find jobs.', profile, 'profile-form'),
    step('save', 'Keep your details up to date', 'Save through the normal form when you are ready. You can pause this guide to make changes; the tour will never fill or save fields for you.', profile, 'profile-form'),
  ] },
  { id: 'resume', title: 'Your résumé', steps: [
    step('upload', 'Add a résumé if you have one', 'Use the résumé upload control in Profile. Follow the file format and size limits shown there. Uploading a file is optional for this tour.', profile, 'profile-resume'),
    step('print', 'Print your profile as a résumé', 'This view turns your profile details into a résumé. Print or save as PDF uses your browser’s print dialog. This is separate from the file you upload.', '/candidate/profile/resume', page),
  ] },
  { id: 'jobs', title: 'Find jobs and matching', steps: [
    step('search', 'Search for a role', 'Enter a role or keyword, then use the available filters to narrow the results. You can continue without searching.', jobs, 'job-search'),
    step('filters', 'Understand your results', 'Matches my needs ranks jobs by accommodation fit, not hiring likelihood. Work preferences from your profile may also filter results. Clear filters or browse all jobs if nothing appears.', jobs, 'job-results'),
  ] },
  { id: 'job', title: 'Job details', steps: [
    step('choose', 'Choose a job to explore', 'The next step opens the first available job in this list. If no job is available, you will see a clearly labeled example instead.', jobs, 'job-results', { capture: 'job' }),
    step('details', 'Read beyond the title', 'Review the description, requirements, work arrangement, and listed accommodations. Compare the match breakdown with your own needs before applying.', '@job', 'job-details', { example: 'Example — not a real job: Office assistant · On-site · Flexible hours listed. A match describes accommodation coverage, not a hiring promise.' }),
  ] },
  { id: 'employer', title: 'Employer details and trust score', steps: [
    step('choose', 'Start with a job', 'Next opens an available job so you can follow its employer information. If no listing is available, the tour uses an example.', jobs, 'job-results', { capture: 'job' }),
    step('link', 'Meet the employer', 'The employer link leads to their information and available jobs. Next follows that link when it is available.', '@job', 'job-details', { capture: 'employer', example: 'Example — an employer name on a job links to that employer’s public information.' }),
    step('score', 'Understand the trust score', 'An employer’s verification badge and accommodation ratings mean different things. The trust score reflects reported accommodation delivery. Not rated yet is not a zero score or a quality guarantee.', '@employer', 'employer-details', { example: 'Example — not a real employer: Example Company · Not rated yet. Ratings appear only when the system’s response threshold is met.' }),
  ] },
  { id: 'apply', title: 'Applying for a job', steps: [
    step('choose', 'Review a job first', 'Next opens an available job. Review its details before deciding to apply; this tour does not send applications.', jobs, 'job-results', { capture: 'job' }),
    step('review', 'Apply when you are ready', 'The Apply action leads to a form with a cover note and interview accommodation request. Email checks, closed jobs, and existing applications still apply. Leave the tour before submitting.', '@job', 'job-details', { capture: 'apply', example: 'Example — apply from an open job after reviewing its details.' }),
    step('form', 'Review before you send', 'The form has space for a cover note and interview accommodation request. Check the profile notice and any eligibility message. Finish this chapter or leave the tour before using the real submission button.', '@apply', 'apply-form', { example: 'Example — not a real application: cover note and interview accommodation request. This read-only example cannot submit.', leave: true }),
  ] },
  { id: 'applications', title: 'Track applications', steps: [
    step('list', 'Follow your progress', 'Your applications appear here after you apply. Open one to see its status and next steps. Next opens the first available application, or an example.', applications, page, { capture: 'application' }),
    step('detail', 'Read your application status', 'Check the status and progress shown on this page. Only the employer can update your application status.', '@application', 'application-details', { example: 'Example — not a real application: Office assistant · Pending. An employer may review it and later record a decision.' }),
  ] },
  { id: 'notifications', title: 'Notifications', steps: [
    step('updates', 'Check for updates', 'Updates about applications and available feedback appear here. An empty list is normal for a new account. The header count refreshes when you navigate pages.', '/notifications', page),
    step('read', 'Open an update when needed', 'Use a notification link to view its related record, or the page’s read controls to manage updates. Next does not mark notifications read.', '/notifications', page),
  ] },
  { id: 'feedback', title: 'Rate accommodations after hiring', steps: [
    step('where', 'Feedback becomes available after hiring', 'Eligible applications show when accommodation feedback is available. Follow the dates and actions in your application; a new account does not need to submit feedback.', applications, page, { capture: 'application' }),
    step('eligibility', 'Look for the feedback action', 'Your application shows any available feedback action. Next follows it if available; otherwise you can read an example.', '@application', 'application-details', { capture: 'feedback', example: 'Example — feedback becomes available only for an eligible hired application.' }),
    step('ratings', 'Describe the accommodations delivered', 'Rate the accommodations listed when you were hired and optionally add a comment. Follow the form’s available choices. The tour never sends ratings.', '@feedback', 'feedback-form', { example: 'Example — not a real rating: Flexible hours · Delivered, partly delivered, not delivered, or not used. Follow the live form’s validation before submitting.' }),
  ] },
  { id: 'support', title: 'Account, help, and support', steps: [
    step('password', 'Manage your account', 'Change your password here when you need to. Log out is in Account or Menu. The tour will not change your password or log you out.', '/account/password', page),
    step('help', 'Help is always available', 'How OpenDoor works explains the candidate journey and trust score. Use Contact us for support, and the footer for privacy and accessibility information.', '/help', 'help-content'),
    step('contact', 'Contact the team', 'Use the contact options when you need help. Tour controls never send a message. You can replay any chapter from your dashboard or Display settings.', '/contact', 'contact-content'),
  ] },
]
export const chapterById = (id) => chapters.find((chapter) => chapter.id === id) ?? chapters[0]
export const tourPath = '/candidate/tour'
