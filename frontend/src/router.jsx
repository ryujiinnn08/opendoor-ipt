import TourHub from './onboarding/TourHub.jsx'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireEmployerProfile, RequireNoEmployerProfile } from './auth/EmployerRoutes.jsx'
import GuestRoute from './auth/GuestRoute.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import PageLoading from './components/layout/PageLoading.jsx'
import PortalLayout from './components/layout/PortalLayout.jsx'
import PublicLayout from './components/layout/PublicLayout.jsx'
import RootLayout from './components/layout/RootLayout.jsx'
import RouteError from './components/layout/RouteError.jsx'
import ChangePasswordPage from './portals/account/ChangePasswordPage.jsx'
import DisplayPage from './portals/account/DisplayPage.jsx'
import NotificationsPage from './portals/account/NotificationsPage.jsx'
import ApplicationPage from './portals/candidate/ApplicationPage.jsx'
import FeedbackPage from './portals/candidate/FeedbackPage.jsx'
import ApplyPage from './portals/candidate/ApplyPage.jsx'
import CandidateDashboard from './portals/candidate/CandidateDashboard.jsx'
import FindJobsPage from './portals/candidate/FindJobsPage.jsx'
import MyApplicationsPage from './portals/candidate/MyApplicationsPage.jsx'
import NeedsPage from './portals/candidate/NeedsPage.jsx'
import ProfilePage from './portals/candidate/ProfilePage.jsx'
import ResumePage from './portals/candidate/ResumePage.jsx'
import AccessibilityPage from './portals/public/AccessibilityPage.jsx'
import HelpPage from './portals/public/HelpPage.jsx'
import ContactPage from './portals/public/ContactPage.jsx'
import BrowseJobsPage from './portals/public/BrowseJobsPage.jsx'
import EmployerPage from './portals/public/EmployerPage.jsx'
import HomePage from './portals/public/HomePage.jsx'
import JobPage from './portals/public/JobPage.jsx'
import JoinPage from './portals/public/JoinPage.jsx'
import LoginPage from './portals/public/LoginPage.jsx'
import NotFoundPage from './portals/public/NotFoundPage.jsx'
import PrivacyPage from './portals/public/PrivacyPage.jsx'
import RegisterPage from './portals/public/RegisterPage.jsx'

function portal(role, pages) {
  return {
    element: <ProtectedRoute roles={[role]} />,
    children: [
      { path: `/${role}`, element: <Navigate to={`/${role}/dashboard`} replace /> },
      { element: <PortalLayout />, children: pages },
    ],
  }
}

export const routes = [
  {
    element: <RootLayout />,
    // Opening or refreshing an on-demand (admin or employer) page: shown until its code arrives.
    hydrateFallbackElement: <PageLoading />,
    // A page that fails to load, e.g., an old tab after a redeploy, reloads or explains (RouteError).
    errorElement: <RouteError />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/privacy', element: <PrivacyPage /> },
          { path: '/accessibility', element: <AccessibilityPage /> },
          { path: '/help', element: <HelpPage /> },
          { path: '/contact', element: <ContactPage /> },
          { path: '/join/:code', element: <JoinPage /> },
          { path: '/jobs', element: <BrowseJobsPage /> },
          { path: '/jobs/:id', element: <JobPage /> },
          { path: '/employers/:id', element: <EmployerPage /> },
          {
            element: <GuestRoute />,
            children: [
              { path: '/login', element: <LoginPage /> },
              { path: '/register', element: <RegisterPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      portal('candidate', [
        { path: '/candidate/tour', element: <TourHub /> },
        { path: '/candidate/dashboard', element: <CandidateDashboard /> },
        { path: '/candidate/needs', element: <NeedsPage /> },
        { path: '/candidate/profile', element: <ProfilePage /> },
        { path: '/candidate/profile/resume', element: <ResumePage /> },
        { path: '/candidate/jobs', element: <FindJobsPage /> },
        { path: '/candidate/jobs/:id', element: <JobPage basePath="/candidate/jobs" employerBasePath="/candidate/employers" /> },
        { path: '/candidate/employers/:id', element: <EmployerPage basePath="/candidate/jobs" /> },
        { path: '/candidate/jobs/:id/apply', element: <ApplyPage /> },
        { path: '/candidate/applications', element: <MyApplicationsPage /> },
        { path: '/candidate/applications/:id', element: <ApplicationPage /> },
        { path: '/candidate/applications/:id/feedback', element: <FeedbackPage /> },
      ]),
      portal('employer', [
        { element: <RequireNoEmployerProfile />, children: [{ path: '/employer/setup', lazy: async () => ({ Component: (await import('./portals/employer/SetupPage.jsx')).default }) }] },
        {
          element: <RequireEmployerProfile kinds={['owner', 'hr', 'individual']} />,
          children: [
            { path: '/employer/dashboard', lazy: async () => ({ Component: (await import('./portals/employer/EmployerDashboard.jsx')).default }) },
            { path: '/employer/job-postings', lazy: async () => ({ Component: (await import('./portals/employer/JobPostingsPage.jsx')).default }) },
            { path: '/employer/job-postings/new', lazy: async () => ({ Component: (await import('./portals/employer/JobPostingFormPage.jsx')).default }) },
            { path: '/employer/job-postings/:id', lazy: async () => ({ Component: (await import('./portals/employer/JobPostingPreviewPage.jsx')).default }) },
            { path: '/employer/job-postings/:id/edit', lazy: async () => ({ Component: (await import('./portals/employer/JobPostingFormPage.jsx')).default }) },
            { path: '/employer/job-postings/:id/applicants', lazy: async () => ({ Component: (await import('./portals/employer/ApplicantsPage.jsx')).default }) },
            { path: '/employer/applications/:id', lazy: async () => ({ Component: (await import('./portals/employer/ApplicantPage.jsx')).default }) },
            { path: '/employer/trust-score', lazy: async () => ({ Component: (await import('./portals/employer/TrustScorePage.jsx')).default }) },
          ],
        },
        {
          element: <RequireEmployerProfile kinds={['owner']} />,
          children: [
            { path: '/employer/company', lazy: async () => ({ Component: (await import('./portals/employer/CompanyPage.jsx')).default }) },
            { path: '/employer/team', lazy: async () => ({ Component: (await import('./portals/employer/TeamPage.jsx')).default }) },
          ],
        },
        {
          element: <RequireEmployerProfile kinds={['individual']} />,
          children: [{ path: '/employer/profile', lazy: async () => ({ Component: (await import('./portals/employer/IndividualProfilePage.jsx')).default }) }],
        },
      ]),
      portal('admin', [
        { path: '/admin/dashboard', lazy: async () => ({ Component: (await import('./portals/admin/AdminDashboard.jsx')).default }) },
        { path: '/admin/categories', lazy: async () => ({ Component: (await import('./portals/admin/CategoriesPage.jsx')).default }) },
        { path: '/admin/accommodations', lazy: async () => ({ Component: (await import('./portals/admin/AccommodationsPage.jsx')).default }) },
        { path: '/admin/employers', lazy: async () => ({ Component: (await import('./portals/admin/EmployerVerificationPage.jsx')).default }) },
        { path: '/admin/job-postings', lazy: async () => ({ Component: (await import('./portals/admin/PostingApprovalsPage.jsx')).default }) },
        { path: '/admin/job-postings/:id', lazy: async () => ({ Component: (await import('./portals/admin/PostingReviewPage.jsx')).default }) },
        { path: '/admin/settings', lazy: async () => ({ Component: (await import('./portals/admin/SettingsPage.jsx')).default }) },
        { path: '/admin/feedback', lazy: async () => ({ Component: (await import('./portals/admin/FeedbackModerationPage.jsx')).default }) },
        { path: '/admin/users', lazy: async () => ({ Component: (await import('./portals/admin/UsersPage.jsx')).default }) },
        { path: '/admin/users/new', lazy: async () => ({ Component: (await import('./portals/admin/AddAdminPage.jsx')).default }) },
        { path: '/admin/users/:id', lazy: async () => ({ Component: (await import('./portals/admin/UserPage.jsx')).default }) },
      ]),
      // Every portal (Phase 6A): the header shows the user's own portal.
      {
        element: <ProtectedRoute roles={['candidate', 'employer', 'admin']} />,
        children: [
          { path: '/account', element: <Navigate to="/account/display" replace /> },
          {
            element: <PortalLayout />,
            children: [
              { path: '/account/display', element: <DisplayPage /> },
              { path: '/account/password', element: <ChangePasswordPage /> },
            ],
          },
        ],
      },
      // Job seekers and employers (Phase 6B); admins have their queues.
      {
        element: <ProtectedRoute roles={['candidate', 'employer']} />,
        children: [{ element: <PortalLayout />, children: [{ path: '/notifications', element: <NotificationsPage /> }] }],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
