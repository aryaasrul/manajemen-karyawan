import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useCompanyStore } from './stores/companyStore';

// Components
import Layout from './components/common/Layout';
import AuthGuard from './components/auth/AuthGuard';
import LoadingSpinner from './components/common/LoadingSpinner';

// --- Statically Imported Pages (Core) ---
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import SalaryPage from './pages/SalaryPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminSalary from './pages/admin/AdminSalary';

// --- Dynamically Imported Pages (Lazy Loaded) ---
const EnhancedAttendancePage = lazy(() => import('./pages/EnhancedAttendancePage'));
const AdminManagementPage = lazy(() => import('./pages/admin/AdminManagementPage'));
const AdminApprovalDashboard = lazy(() => import('./pages/admin/AdminApprovalDashboard'));

// --- Fallback Component for Suspense ---
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[calc(100vh-200px)]">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">Memuat halaman...</p>
    </div>
  </div>
);

// --- Smart Redirect Component ---
const SmartRedirect = () => {
  const { profile } = useAuthStore();
  
  if (profile?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
};

function App() {
  const { initialize, isLoading } = useAuthStore();
  const { getSettings } = useCompanyStore();

  useEffect(() => {
    const initializeApp = async () => {
      await initialize();
      await getSettings();
    };
    initializeApp();
  }, [initialize, getSettings]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* --- Authenticated Redirect --- */}
          <Route path="/" element={<AuthGuard><SmartRedirect /></AuthGuard>} />
          
          {/* --- Employee Routes --- */}
          <Route path="/dashboard" element={<AuthGuard><Layout><DashboardPage /></Layout></AuthGuard>} />
          <Route path="/attendance" element={<AuthGuard><Layout><AttendancePage /></Layout></AuthGuard>} />
          <Route path="/attendance/enhanced" element={<AuthGuard><Layout><Suspense fallback={<PageLoader />}><EnhancedAttendancePage /></Suspense></Layout></AuthGuard>} />
          <Route path="/salary" element={<AuthGuard><Layout><SalaryPage /></Layout></AuthGuard>} />
          <Route path="/profile" element={<AuthGuard><Layout><ProfilePage /></Layout></AuthGuard>} />
          
          {/* --- Admin Routes --- */}
          <Route path="/admin" element={<AuthGuard requireAdmin><Layout><AdminDashboard /></Layout></AuthGuard>} />
          <Route path="/admin/employees" element={<AuthGuard requireAdmin><Layout><AdminEmployees /></Layout></AuthGuard>} />
          <Route path="/admin/attendance" element={<AuthGuard requireAdmin><Layout><AdminAttendance /></Layout></AuthGuard>} />
          <Route path="/admin/salary" element={<AuthGuard requireAdmin><Layout><AdminSalary /></Layout></AuthGuard>} />
          <Route path="/admin/approvals" element={<AuthGuard requireAdmin><Layout><Suspense fallback={<PageLoader />}><AdminApprovalDashboard /></Suspense></Layout></AuthGuard>} />
          <Route path="/admin/management" element={<AuthGuard requireAdmin><Layout><Suspense fallback={<PageLoader />}><AdminManagementPage /></Suspense></Layout></AuthGuard>} />

          {/* --- Fallback Route for any other path --- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#363636', color: '#fff' },
            success: { duration: 3000, style: { background: '#10B981', color: '#fff' } },
            error: { duration: 5000, style: { background: '#EF4444', color: '#fff' } },
            loading: { style: { background: '#3B82F6', color: '#fff' } },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
