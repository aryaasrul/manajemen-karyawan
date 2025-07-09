import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { 
  Home, 
  Clock, 
  DollarSign, 
  User, 
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Users,
  BarChart3
} from 'lucide-react'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuthStore()
  const location = useLocation()

  // Navigation untuk Employee
  const employeeNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Absensi', href: '/attendance', icon: Clock },
    { name: 'Gaji', href: '/salary', icon: DollarSign },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  // Navigation untuk Admin
  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: BarChart3 },
    { name: 'Kelola Karyawan', href: '/admin/employees', icon: Users },
    { name: 'Kelola Absensi', href: '/admin/attendance', icon: Clock },
    { name: 'Kelola Gaji', href: '/admin/salary', icon: DollarSign },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  // Pilih navigation berdasarkan role
  const navigation = profile?.role === 'admin' ? adminNavigation : employeeNavigation
  
  const handleSignOut = async () => {
    await signOut()
  }

  const getAppTitle = () => {
    return profile?.role === 'admin' ? 'Admin Panel' : 'Employee App'
  }

  const getUserDisplayInfo = () => {
    return {
      name: profile?.full_name || 'User',
      subtitle: profile?.role === 'admin' ? 'Administrator' : profile?.employee_id || 'Employee',
      bgColor: profile?.role === 'admin' ? 'bg-red-500' : 'bg-primary-500'
    }
  }

  const userInfo = getUserDisplayInfo()

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">{getAppTitle()}</h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} className="mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Admin Badge */}
          {profile?.role === 'admin' && (
            <div className="mt-8 mx-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm font-medium text-red-700">Administrator</span>
              </div>
            </div>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 ${userInfo.bgColor} rounded-full flex items-center justify-center`}>
                <span className="text-white text-sm font-medium">
                  {userInfo.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{userInfo.name}</p>
              <p className="text-xs text-gray-500">{userInfo.subtitle}</p>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-medium text-gray-900">{getAppTitle()}</h1>
            <div className="w-6"></div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Layout