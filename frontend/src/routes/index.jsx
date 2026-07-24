import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ProtectedRoute, GuestRoute } from './ProtectedRoute'
import PublicLayout from '@/layouts/PublicLayout'
import AuthLayout from '@/layouts/AuthLayout'
import JobSeekerLayout from '@/layouts/JobSeekerLayout'
import CompanyLayout from '@/layouts/CompanyLayout'
import AdminLayout from '@/layouts/AdminLayout'
import { Skeleton } from '@/components/ui'

const Loading = () => (
  <div className="flex-1 p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-96" />
    <div className="grid grid-cols-4 gap-4 mt-6">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  </div>
)

// Public pages
const Landing = lazy(() => import('@/pages/public/Landing'))
const About = lazy(() => import('@/pages/public/About'))
const Contact = lazy(() => import('@/pages/public/Contact'))
const Pricing = lazy(() => import('@/pages/public/Pricing'))
const FAQ = lazy(() => import('@/pages/public/FAQ'))
const Privacy = lazy(() => import('@/pages/public/Privacy'))
const Terms = lazy(() => import('@/pages/public/Terms'))
const CompanyDirectory = lazy(() => import('@/pages/public/CompanyDirectory'))
const JobDirectory = lazy(() => import('@/pages/public/JobDirectory'))

// Auth pages
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const RoleSelection = lazy(() => import('@/pages/auth/RoleSelection'))

// Job Seeker pages
const JSdashboard = lazy(() => import('@/pages/jobseeker/Dashboard'))
const FindJobs = lazy(() => import('@/pages/jobseeker/FindJobs'))
const JobDetails = lazy(() => import('@/pages/jobseeker/JobDetails'))
const ApplyJob = lazy(() => import('@/pages/jobseeker/ApplyJob'))
const SavedJobs = lazy(() => import('@/pages/jobseeker/SavedJobs'))
const Applications = lazy(() => import('@/pages/jobseeker/Applications'))
const ApplicationDetail = lazy(() => import('@/pages/jobseeker/ApplicationDetail'))
const ResumeBuilder = lazy(() => import('@/pages/jobseeker/ResumeBuilder'))
const JSMessages = lazy(() => import('@/pages/jobseeker/Messages'))
const JSProfile = lazy(() => import('@/pages/jobseeker/Profile'))
const JSSettings = lazy(() => import('@/pages/jobseeker/Settings'))

// Company pages
const CompanyDashboard = lazy(() => import('@/pages/company/Dashboard'))
const CompanyVerification = lazy(() => import('@/pages/company/Verification'))
const PostJob = lazy(() => import('@/pages/company/PostJob'))
const ManageJobs = lazy(() => import('@/pages/company/ManageJobs'))
const EditJob = lazy(() => import('@/pages/company/EditJob'))
const Applicants = lazy(() => import('@/pages/company/Applicants'))
const CandidateProfile = lazy(() => import('@/pages/company/CandidateProfile'))
const CompanyProfile = lazy(() => import('@/pages/company/CompanyProfile'))
const Billing = lazy(() => import('@/pages/company/Billing'))
const CompanySettings = lazy(() => import('@/pages/company/Settings'))
const CompanyAnalytics = lazy(() => import('@/pages/company/Analytics'))

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminUsers = lazy(() => import('@/pages/admin/Users'))
const AdminUserDetails = lazy(() => import('@/pages/admin/UserDetails'))
const AdminCompanies = lazy(() => import('@/pages/admin/Companies'))
const AdminCompanyDetails = lazy(() => import('@/pages/admin/CompanyDetails'))
const VerificationQueue = lazy(() => import('@/pages/admin/VerificationQueue'))
const AdminJobs = lazy(() => import('@/pages/admin/Jobs'))
const AdminReports = lazy(() => import('@/pages/admin/Reports'))
const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'))
const AdminRevenue = lazy(() => import('@/pages/admin/Revenue'))
const AdminSettings = lazy(() => import('@/pages/admin/Settings'))

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/companies" element={<CompanyDirectory />} />
          <Route path="/jobs" element={<JobDirectory />} />
        </Route>

        {/* Auth */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/register/role" element={<GuestRoute><RoleSelection /></GuestRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Public Job/Company detail pages (within public layout) */}
        <Route element={<PublicLayout />}>
          <Route path="/jobs/:id" element={<JobDetails />} />
        </Route>

        {/* Job Seeker Portal */}
        <Route element={<ProtectedRoute role="job_seeker"><JobSeekerLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<JSdashboard />} />
          <Route path="/dashboard/find-jobs" element={<FindJobs />} />
          <Route path="/dashboard/jobs/:id" element={<JobDetails />} />
          <Route path="/dashboard/jobs/:id/apply" element={<ApplyJob />} />
          <Route path="/dashboard/saved-jobs" element={<SavedJobs />} />
          <Route path="/dashboard/applications" element={<Applications />} />
          <Route path="/dashboard/applications/:id" element={<ApplicationDetail />} />
          <Route path="/dashboard/resume" element={<ResumeBuilder />} />
          <Route path="/dashboard/messages" element={<JSMessages />} />
          <Route path="/dashboard/profile" element={<JSProfile />} />
          <Route path="/dashboard/settings" element={<JSSettings />} />
        </Route>

        {/* Company Portal */}
        <Route element={<ProtectedRoute role="company"><CompanyLayout /></ProtectedRoute>}>
          <Route path="/company/dashboard" element={<CompanyDashboard />} />
          <Route path="/company/verification" element={<CompanyVerification />} />
          <Route path="/company/post-job" element={<PostJob />} />
          <Route path="/company/jobs" element={<ManageJobs />} />
          <Route path="/company/jobs/:id/edit" element={<EditJob />} />
          <Route path="/company/applicants" element={<Applicants />} />
          <Route path="/company/applicants/:id" element={<CandidateProfile />} />
          <Route path="/company/profile" element={<CompanyProfile />} />
          <Route path="/company/analytics" element={<CompanyAnalytics />} />
          <Route path="/company/billing" element={<Billing />} />
          <Route path="/company/settings" element={<CompanySettings />} />
        </Route>

        {/* Admin Portal */}
        <Route element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/:id" element={<AdminUserDetails />} />
          <Route path="/admin/companies" element={<AdminCompanies />} />
          <Route path="/admin/companies/:id" element={<AdminCompanyDetails />} />
          <Route path="/admin/verification" element={<VerificationQueue />} />
          <Route path="/admin/jobs" element={<AdminJobs />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/revenue" element={<AdminRevenue />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
