import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireEmployerProfile, RequireNoEmployerProfile } from './auth/EmployerRoutes.jsx'
import GuestRoute from './auth/GuestRoute.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import PortalLayout from './components/layout/PortalLayout.jsx'
import PublicLayout from './components/layout/PublicLayout.jsx'
import RootLayout from './components/layout/RootLayout.jsx'
import ChangePasswordPage from './portals/account/ChangePasswordPage.jsx'
import NotificationsPage from './portals/account/NotificationsPage.jsx'
import AccommodationsPage from './portals/admin/AccommodationsPage.jsx'
import AddAdminPage from './portals/admin/AddAdminPage.jsx'
import AdminDashboard from './portals/admin/AdminDashboard.jsx'
import FeedbackModerationPage from './portals/admin/FeedbackModerationPage.jsx'
import CategoriesPage from './portals/admin/CategoriesPage.jsx'
import EmployerVerificationPage from './portals/admin/EmployerVerificationPage.jsx'
import PostingApprovalsPage from './portals/admin/PostingApprovalsPage.jsx'
import PostingReviewPage from './portals/admin/PostingReviewPage.jsx'
import SettingsPage from './portals/admin/SettingsPage.jsx'
import UserPage from './portals/admin/UserPage.jsx'
import UsersPage from './portals/admin/UsersPage.jsx'
import ApplicationPage from './portals/candidate/ApplicationPage.jsx'
import FeedbackPage from './portals/candidate/FeedbackPage.jsx'
import ApplyPage from './portals/candidate/ApplyPage.jsx'
import CandidateDashboard from './portals/candidate/CandidateDashboard.jsx'
import FindJobsPage from './portals/candidate/FindJobsPage.jsx'
import MyApplicationsPage from './portals/candidate/MyApplicationsPage.jsx'
import NeedsPage from './portals/candidate/NeedsPage.jsx'
import ProfilePage from './portals/candidate/ProfilePage.jsx'
import ResumePage from './portals/candidate/ResumePage.jsx'
import ApplicantPage from './portals/employer/ApplicantPage.jsx'
import ApplicantsPage from './portals/employer/ApplicantsPage.jsx'
import CompanyPage from './portals/employer/CompanyPage.jsx'
import EmployerDashboard from './portals/employer/EmployerDashboard.jsx'
import IndividualProfilePage from './portals/employer/IndividualProfilePage.jsx'
import JobPostingFormPage from './portals/employer/JobPostingFormPage.jsx'
import JobPostingPreviewPage from './portals/employer/JobPostingPreviewPage.jsx'
import JobPostingsPage from './portals/employer/JobPostingsPage.jsx'
import SetupPage from './portals/employer/SetupPage.jsx'
import TeamPage from './portals/employer/TeamPage.jsx'
import TrustScorePage from './portals/employer/TrustScorePage.jsx'
import AccessibilityPage from './portals/public/AccessibilityPage.jsx'
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
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/privacy', element: <PrivacyPage /> },
          { path: '/accessibility', element: <AccessibilityPage /> },
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
        { element: <RequireNoEmployerProfile />, children: [{ path: '/employer/setup', element: <SetupPage /> }] },
        {
          element: <RequireEmployerProfile kinds={['owner', 'hr', 'individual']} />,
          children: [
            { path: '/employer/dashboard', element: <EmployerDashboard /> },
            { path: '/employer/job-postings', element: <JobPostingsPage /> },
            { path: '/employer/job-postings/new', element: <JobPostingFormPage /> },
            { path: '/employer/job-postings/:id', element: <JobPostingPreviewPage /> },
            { path: '/employer/job-postings/:id/edit', element: <JobPostingFormPage /> },
            { path: '/employer/job-postings/:id/applicants', element: <ApplicantsPage /> },
            { path: '/employer/applications/:id', element: <ApplicantPage /> },
            { path: '/employer/trust-score', element: <TrustScorePage /> },
          ],
        },
        {
          element: <RequireEmployerProfile kinds={['owner']} />,
          children: [
            { path: '/employer/company', element: <CompanyPage /> },
            { path: '/employer/team', element: <TeamPage /> },
          ],
        },
        {
          element: <RequireEmployerProfile kinds={['individual']} />,
          children: [{ path: '/employer/profile', element: <IndividualProfilePage /> }],
        },
      ]),
      portal('admin', [
        { path: '/admin/dashboard', element: <AdminDashboard /> },
        { path: '/admin/categories', element: <CategoriesPage /> },
        { path: '/admin/accommodations', element: <AccommodationsPage /> },
        { path: '/admin/employers', element: <EmployerVerificationPage /> },
        { path: '/admin/job-postings', element: <PostingApprovalsPage /> },
        { path: '/admin/job-postings/:id', element: <PostingReviewPage /> },
        { path: '/admin/settings', element: <SettingsPage /> },
        { path: '/admin/feedback', element: <FeedbackModerationPage /> },
        { path: '/admin/users', element: <UsersPage /> },
        { path: '/admin/users/new', element: <AddAdminPage /> },
        { path: '/admin/users/:id', element: <UserPage /> },
      ]),
      // Every portal (Phase 6A): the header shows the user's own portal.
      {
        element: <ProtectedRoute roles={['candidate', 'employer', 'admin']} />,
        children: [{ element: <PortalLayout />, children: [{ path: '/account/password', element: <ChangePasswordPage /> }] }],
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
