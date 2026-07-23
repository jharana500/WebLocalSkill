import { useEffect } from 'react'
import AppRoutes from '@/routes'
import { ToastContainer } from '@/components/ui'
import useAuthStore from '@/store/authStore'

function AppLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const initializeAuth = useAuthStore((s) => s.initializeAuth)

  useEffect(() => {
    initializeAuth()
    // Runs once on app boot to validate any persisted session against the backend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isInitializing) return <AppLoadingScreen />

  return (
    <>
      <AppRoutes />
      <ToastContainer />
    </>
  )
}
