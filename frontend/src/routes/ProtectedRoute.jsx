import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { normalizeRole, getRoleDashboardPath } from '@/utils/roles'

export function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user, logout } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role && normalizeRole(user?.role) !== normalizeRole(role)) {
    const dashboardPath = getRoleDashboardPath(user?.role)
    if (!dashboardPath) {
      // Unknown/unsupported role — fail safe instead of bouncing forever.
      logout()
      return <Navigate to="/login" replace />
    }
    return <Navigate to={dashboardPath} replace />
  }

  return children
}

export function GuestRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to={getRoleDashboardPath(user?.role) || '/dashboard'} replace />
  }

  return children
}
