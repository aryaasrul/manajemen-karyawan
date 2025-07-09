import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAttendanceStore } from '../stores/attendanceStore'
import { Clock, Calendar, DollarSign, CheckCircle, XCircle } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/id'

dayjs.locale('id')

const DashboardPage = () => {
  const { user, profile } = useAuthStore()
  const { todayAttendance, getTodayAttendance } = useAttendanceStore()

  useEffect(() => {
    if (user?.id) {
      getTodayAttendance(user.id)
    }
  }, [user?.id, getTodayAttendance])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Selamat Pagi'
    if (hour < 18) return 'Selamat Siang'
    return 'Selamat Malam'
  }

  const formatTime = (timeString) => {
    if (!timeString) return '-'
    return dayjs(timeString).format('HH:mm')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {profile?.full_name}!
        </h1>
        <p className="text-gray-600 mt-1">
          {dayjs().format('dddd, DD MMMM YYYY')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {todayAttendance?.status === 'completed' ? (
                <CheckCircle className="h-8 w-8 text-success-500" />
              ) : todayAttendance?.check_in_time ? (
                <Clock className="h-8 w-8 text-yellow-500" />
              ) : (
                <XCircle className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Status Hari Ini</p>
              <p className="text-lg font-semibold text-gray-900">
                {todayAttendance?.status === 'completed' 
                  ? 'Selesai'
                  : todayAttendance?.check_in_time 
                    ? 'Sedang Bekerja'
                    : 'Belum Absen'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Check-in Time */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-primary-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Jam Masuk</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTime(todayAttendance?.check_in_time)}
              </p>
            </div>
          </div>
        </div>

        {/* Check-out Time */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Jam Keluar</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTime(todayAttendance?.check_out_time)}
              </p>
            </div>
          </div>
        </div>

        {/* Working Minutes */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-success-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Menit Kerja</p>
              <p className="text-lg font-semibold text-gray-900">
                {todayAttendance?.total_minutes || 0} menit
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Earnings */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-sm p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Perkiraan Gaji Hari Ini</h3>
            <p className="text-2xl font-bold mt-2">
              Rp {((todayAttendance?.total_minutes || 0) * (profile?.rate_per_minute || 0)).toLocaleString('id-ID')}
            </p>
            <p className="text-primary-100 text-sm mt-1">
              {todayAttendance?.total_minutes || 0} menit × Rp {(profile?.rate_per_minute || 0).toLocaleString('id-ID')}/menit
            </p>
          </div>
          <DollarSign className="h-12 w-12 text-primary-200" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/attendance"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Clock className="h-6 w-6 text-primary-500 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Absensi</p>
              <p className="text-sm text-gray-600">Check-in / Check-out</p>
            </div>
          </a>
          
          <a
            href="/salary"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <DollarSign className="h-6 w-6 text-primary-500 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Slip Gaji</p>
              <p className="text-sm text-gray-600">Lihat riwayat gaji</p>
            </div>
          </a>
          
          <a
            href="/profile"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Calendar className="h-6 w-6 text-primary-500 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Profile</p>
              <p className="text-sm text-gray-600">Update informasi</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage