import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

export function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role && user?.role !== role) {
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (user?.role === 'company') return <Navigate to="/company/dashboard" replace />
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export function GuestRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()

  if (isAuthenticated) {
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (user?.role === 'company') return <Navigate to="/company/dashboard" replace />
    return <Navigate to="/dashboard" replace />
  }

  return children
}
