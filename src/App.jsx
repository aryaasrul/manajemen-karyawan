import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import { useCompanyStore } from './stores/companyStore'

// Components (existing structure)
import Layout from './components/common/Layout'
import AuthGuard from './components/auth/AuthGuard'
import LoadingSpinner from './components/common/LoadingSpinner'

// Public Pages
import LoginPage from './pages/LoginPage'

// Employee Pages (existing)
import DashboardPage from './pages/DashboardPage'
import AttendancePage from './pages/AttendancePage'
import SalaryPage from './pages/SalaryPage'
import ProfilePage from './pages/ProfilePage'

// Admin Pages (existing)
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminEmployees from './pages/admin/AdminEmployees'
import AdminAttendance from './pages/admin/AdminAttendance'
import AdminSalary from './pages/admin/AdminSalary'
import AdminSettings from './pages/admin/AdminSettings'

// Enhanced Pages (conditional imports - will only import if files exist)
let EnhancedAttendancePage = null
let AdminManagementPage = null
let AdminApprovalDashboard = null

try {
  // Try to import enhanced pages (graceful failure if not exist)
  EnhancedAttendancePage = require('./pages/EnhancedAttendancePage').default
} catch (e) {
  // EnhancedAttendancePage not available yet
  console.log('EnhancedAttendancePage not found, using fallback')
}

try {
  AdminManagementPage = require('./pages/admin/AdminManagementPage').default
} catch (e) {
  console.log('AdminManagementPage not found, using fallback')
}

try {
  AdminApprovalDashboard = require('./pages/admin/AdminApprovalDashboard').default
} catch (e) {
  console.log('AdminApprovalDashboard not found, using fallback')
}

// Fallback component for missing pages
const ComingSoonPage = ({ title }) => (
  <div className="min-h-96 flex flex-col items-center justify-center bg-white rounded-lg shadow-sm">
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Clock className="h-8 w-8 text-blue-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">Fitur ini sedang dalam pengembangan</p>
      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
        🚧 Coming Soon
      </div>
    </div>
  </div>
)

// Smart redirect component (existing)
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
          
          {/* Attendance routes - Original */}
          <Route path="/attendance" element={
            <AuthGuard>
              <Layout>
                <AttendancePage />
              </Layout>
            </AuthGuard>
          } />
          
          {/* Enhanced Attendance - Conditional */}
          <Route path="/attendance/enhanced" element={
            <AuthGuard>
              <Layout>
                {EnhancedAttendancePage ? (
                  <EnhancedAttendancePage />
                ) : (
                  <ComingSoonPage title="Enhanced Attendance System" />
                )}
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
          
          {/* Admin Settings Route (existing) */}
          <Route path="/admin/settings" element={
            <AuthGuard requireAdmin>
              <Layout>
                <AdminSettings />
              </Layout>
            </AuthGuard>
          } />
          
          {/* Enhanced Admin Routes - Conditional */}
          <Route path="/admin/approvals" element={
            <AuthGuard requireAdmin>
              <Layout>
                {AdminApprovalDashboard ? (
                  <AdminApprovalDashboard />
                ) : (
                  <ComingSoonPage title="Approval Dashboard" />
                )}
              </Layout>
            </AuthGuard>
          } />
          
          <Route path="/admin/management" element={
            <AuthGuard requireAdmin>
              <Layout>
                {AdminManagementPage ? (
                  <AdminManagementPage />
                ) : (
                  <ComingSoonPage title="System Management" />
                )}
              </Layout>
            </AuthGuard>
          } />
          
          {/* Alternative routes for development testing */}
          <Route path="/test/enhanced-attendance" element={
            <AuthGuard>
              <Layout>
                <ComingSoonPage title="Enhanced Attendance (Test Mode)" />
              </Layout>
            </AuthGuard>
          } />
          
          <Route path="/test/admin-management" element={
            <AuthGuard requireAdmin>
              <Layout>
                <ComingSoonPage title="Admin Management (Test Mode)" />
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
            success: {
              duration: 3000,
              style: {
                background: '#10B981',
                color: '#fff',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#EF4444',
                color: '#fff',
              },
            },
            loading: {
              style: {
                background: '#3B82F6',
                color: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App