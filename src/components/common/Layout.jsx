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
  BarChart3,
  CheckSquare,
  MapPin,
  Wifi,
  Radio,
  Bell
} from 'lucide-react'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuthStore()
  const location = useLocation()

  // Navigation untuk Employee (Updated dengan Enhanced Attendance)
  const employeeNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { 
      name: 'Absensi', 
      href: '/attendance/enhanced', // Default ke enhanced version
      icon: Clock,
      badge: false
    },
    { name: 'Gaji', href: '/salary', icon: DollarSign },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  // Navigation untuk Admin (Updated dengan menu baru)
  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: BarChart3 },
    { name: 'Kelola Karyawan', href: '/admin/employees', icon: Users },
    { name: 'Kelola Absensi', href: '/admin/attendance', icon: Clock },
    { 
      name: 'Approval Queue', 
      href: '/admin/approvals', 
      icon: CheckSquare,
      badge: true, // Show notification badge
      badgeCount: 3 // Could be dynamic from state
    },
    { 
      name: 'Manajemen Sistem', 
      href: '/admin/management', 
      icon: Settings,
      submenu: [
        { name: 'Lokasi & WiFi', href: '/admin/management', icon: MapPin },
        { name: 'Device Management', href: '/admin/management?tab=devices', icon: Radio }
      ]
    },
    { name: 'Kelola Gaji', href: '/admin/salary', icon: DollarSign },
    { name: 'Pengaturan', href: '/admin/settings', icon: Settings },
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

  // Helper function to check if route is active
  const isRouteActive = (href) => {
    // Special handling for attendance routes
    if (href === '/attendance/enhanced' && location.pathname.startsWith('/attendance')) {
      return true
    }
    // Special handling for admin management routes
    if (href === '/admin/management' && location.pathname.startsWith('/admin/management')) {
      return true
    }
    // Special handling for admin approvals
    if (href === '/admin/approvals' && location.pathname === '/admin/approvals') {
      return true
    }
    return location.pathname === href
  }

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
              const isActive = isRouteActive(item.href)
              
              return (
                <div key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors relative ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={20} className="mr-3" />
                    <span className="flex-1">{item.name}</span>
                    
                    {/* Badge for notifications */}
                    {item.badge && item.badgeCount && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {item.badgeCount}
                      </span>
                    )}
                    
                    {/* New indicator for recently added features */}
                    {(item.href === '/admin/approvals' || item.href === '/admin/management' || item.href === '/attendance/enhanced') && (
                      <span className="ml-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        NEW
                      </span>
                    )}
                  </Link>
                  
                  {/* Submenu for expandable items */}
                  {item.submenu && isActive && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.submenu.map((subItem) => {
                        const SubIcon = subItem.icon
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                          >
                            <SubIcon size={16} className="mr-2" />
                            {subItem.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
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
              
              {/* Quick Stats for Admin */}
              <div className="mt-2 text-xs text-red-600">
                <div className="flex justify-between">
                  <span>Pending Approvals:</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Employees:</span>
                  <span className="font-medium">12</span>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Attendance Info for Employees */}
          {profile?.role !== 'admin' && (
            <div className="mt-8 mx-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm font-medium text-blue-700">Enhanced Absensi</span>
              </div>
              <div className="mt-2 text-xs text-blue-600">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>GPS + WiFi Validation</span>
                  </div>
                  <div className="flex items-center">
                    <CheckSquare className="h-3 w-3 mr-1" />
                    <span>Auto Approval</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 ${userInfo.bgColor} rounded-full flex items-center justify-center relative`}>
                <span className="text-white text-sm font-medium">
                  {userInfo.name.charAt(0).toUpperCase()}
                </span>
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
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
            
            {/* Mobile notification badge */}
            {profile?.role === 'admin' && (
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-600" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  3
                </span>
              </div>
            )}
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