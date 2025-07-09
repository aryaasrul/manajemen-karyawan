import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const AuthGuard = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, profile } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default AuthGuard
