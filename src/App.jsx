import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import { useCompanyStore } from './stores/companyStore'

// Components
import Layout from './components/common/Layout'
import AuthGuard from './components/auth/AuthGuard'
import LoadingSpinner from './components/common/LoadingSpinner'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AttendancePage from './pages/AttendancePage'
import SalaryPage from './pages/SalaryPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminEmployees from './pages/admin/AdminEmployees'
import AdminAttendance from './pages/admin/AdminAttendance'
import AdminSalary from './pages/admin/AdminSalary'

// Smart redirect component
const SmartRedirect = () => {
  const { profile } = useAuthStore()
  
  // Redirect berdasarkan role
  if (profile?.role === 'admin') {
    return <Navigate to="/admin" replace />
  } else {
    return <Navigate to="/dashboard" replace />
  }
}

function App() {
  const { initialize, isLoading } = useAuthStore()
  const { getSettings } = useCompanyStore()

  useEffect(() => {
    // Initialize auth and company settings
    const initializeApp = async () => {
      await initialize()
      await getSettings()
    }
    
    initializeApp()
  }, [initialize, getSettings])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Smart redirect */}
          <Route path="/" element={
            <AuthGuard>
              <SmartRedirect />
            </AuthGuard>
          } />
          
          {/* Employee routes */}
          <Route path="/dashboard" element={
            <AuthGuard>
              <Layout>
                <DashboardPage />
              </Layout>
            </AuthGuard>
          } />
          
          <Route path="/attendance" element={
            <AuthGuard>
              <Layout>
                <AttendancePage />
              </Layout>
            </AuthGuard>
          } />
          
          <Route path="/salary" element={
            <AuthGuard>
              <Layout>
                <SalaryPage />
              </Layout>
            </AuthGuard>
          } />
          
          <Route path="/profile" element={
            <AuthGuard>
              <Layout>
                <ProfilePage />
              </Layout>
            </AuthGuard>
          } />
          
          {/* Admin routes */}
          <Route path="/admin" element={
            <AuthGuard requireAdmin>
              <Layout>
                <AdminDashboard />
              </Layout>
            </AuthGuard>
          } />
          
          <Route path="/admin/employees" element={
            <AuthGuard requireAdmin>
              <Layout>
                <AdminEmployees />
              </Layout>
            </AuthGuard>
          } />
          
          <Route path="/admin/attendance" element={
            <AuthGuard requireAdmin>
              <Layout>
                <AdminAttendance />
              </Layout>
            </AuthGuard>
          } />
          
          <Route path="/admin/salary" element={
            <AuthGuard requireAdmin>
              <Layout>
                <AdminSalary />
              </Layout>
            </AuthGuard>
          } />
        </Routes>
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App