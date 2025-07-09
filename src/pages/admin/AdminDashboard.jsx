// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Clock, DollarSign, Calendar, TrendingUp, AlertCircle } from 'lucide-react'
import dayjs from 'dayjs'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeToday: 0,
    pendingBonuses: 0,
    monthlyPayroll: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Fetch total employees
      const { data: employees } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('is_active', true)

      // Fetch today's attendance
      const today = dayjs().format('YYYY-MM-DD')
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('id, user_id')
        .eq('date', today)

      // Fetch pending bonuses
      const { data: pendingBonuses } = await supabase
        .from('bonus_pending')
        .select('id')
        .eq('status', 'pending')

      // Fetch this month's salary data
      const currentMonth = dayjs().month() + 1
      const currentYear = dayjs().year()
      const { data: salarySlips } = await supabase
        .from('salary_slips')
        .select('total_salary')
        .eq('month', currentMonth)
        .eq('year', currentYear)

      // Fetch recent activity
      const { data: recentAttendance } = await supabase
        .from('attendance')
        .select(`
          id, 
          date, 
          check_in_time, 
          check_out_time,
          total_minutes,
          profiles(full_name, employee_id)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      // Calculate stats
      setStats({
        totalEmployees: employees?.filter(emp => emp.role === 'employee').length || 0,
        activeToday: todayAttendance?.length || 0,
        pendingBonuses: pendingBonuses?.length || 0,
        monthlyPayroll: salarySlips?.reduce((sum, slip) => sum + Number(slip.total_salary), 0) || 0
      })

      setRecentActivity(recentAttendance || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
            </dd>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </dl>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview sistem manajemen karyawan - {dayjs().format('dddd, DD MMMM YYYY')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Karyawan"
          value={stats.totalEmployees}
          icon={Users}
          color="bg-blue-500"
          subtitle="Karyawan aktif"
        />
        <StatCard
          title="Hadir Hari Ini"
          value={stats.activeToday}
          icon={Clock}
          color="bg-green-500"
          subtitle="Sudah check-in"
        />
        <StatCard
          title="Bonus Pending"
          value={stats.pendingBonuses}
          icon={AlertCircle}
          color="bg-yellow-500"
          subtitle="Menunggu approval"
        />
        <StatCard
          title="Payroll Bulan Ini"
          value={`Rp ${stats.monthlyPayroll.toLocaleString('id-ID')}`}
          icon={DollarSign}
          color="bg-purple-500"
          subtitle={`${dayjs().format('MMMM YYYY')}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h3>
          </div>
          <div className="p-6">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Belum ada aktivitas</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.profiles?.full_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.check_out_time ? 'Check-out' : 'Check-in'} - 
                        {dayjs(activity.check_in_time).format(' HH:mm, DD MMM')}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      {activity.total_minutes || 0} menit
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Aksi Cepat</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <a
                href="/admin/employees"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <Users className="h-6 w-6 text-blue-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Kelola Karyawan</p>
                  <p className="text-sm text-gray-600">Tambah, edit, hapus karyawan</p>
                </div>
              </a>
              
              <a
                href="/admin/attendance"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <Clock className="h-6 w-6 text-green-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Monitor Absensi</p>
                  <p className="text-sm text-gray-600">Lihat dan validasi absensi</p>
                </div>
              </a>
              
              <a
                href="/admin/salary"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <DollarSign className="h-6 w-6 text-purple-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Kelola Gaji</p>
                  <p className="text-sm text-gray-600">Generate slip gaji dan bonus</p>
                </div>
              </a>
              
              {stats.pendingBonuses > 0 && (
                <a
                  href="/admin/salary"
                  className="flex items-center p-4 border border-yellow-200 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors"
                >
                  <AlertCircle className="h-6 w-6 text-yellow-500 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {stats.pendingBonuses} Bonus Pending
                    </p>
                    <p className="text-sm text-gray-600">Perlu approval segera</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Statistik Bulan Ini</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((stats.activeToday / stats.totalEmployees) * 100) || 0}%
              </div>
              <div className="text-sm text-gray-600">Tingkat Kehadiran Hari Ini</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                Rp {Math.round(stats.monthlyPayroll / stats.totalEmployees || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-sm text-gray-600">Rata-rata Gaji Karyawan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.pendingBonuses}
              </div>
              <div className="text-sm text-gray-600">Bonus Menunggu Approval</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard