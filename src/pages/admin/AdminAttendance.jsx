// src/pages/admin/AdminAttendance.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { 
  Clock, 
  Calendar, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle,
  MapPin,
  Camera,
  Filter
} from 'lucide-react'
import dayjs from 'dayjs'

const AdminAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState(dayjs().format('YYYY-MM-DD'))
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedAttendance, setSelectedAttendance] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchAttendanceData()
  }, [dateFilter])

  useEffect(() => {
    filterData()
  }, [attendanceData, searchTerm, statusFilter])

  const fetchAttendanceData = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles:user_id(full_name, employee_id)
        `)
        .eq('date', dateFilter)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAttendanceData(data || [])
    } catch (error) {
      console.error('Error fetching attendance:', error)
      toast.error('Gagal memuat data absensi')
    } finally {
      setIsLoading(false)
    }
  }

  const filterData = () => {
    let filtered = attendanceData

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.profiles?.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    setFilteredData(filtered)
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Selesai', icon: CheckCircle },
      incomplete: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Belum Selesai', icon: Clock },
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft', icon: XCircle }
    }
    
    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const viewDetail = (attendance) => {
    setSelectedAttendance(attendance)
    setShowDetailModal(true)
  }

  const formatTime = (timeString) => {
    return timeString ? dayjs(timeString).format('HH:mm') : '-'
  }

  const calculateWorkDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-'
    const duration = dayjs(checkOut).diff(dayjs(checkIn), 'minute')
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    return `${hours}j ${minutes}m`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Absensi</h1>
        <p className="text-gray-600 mt-1">Monitoring dan validasi absensi karyawan</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="completed">Selesai</option>
              <option value="incomplete">Belum Selesai</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Karyawan</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Nama atau ID karyawan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Absensi Tanggal {dayjs(dateFilter).format('DD MMMM YYYY')} ({filteredData.length} data)
          </h3>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Memuat data...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-6 text-center">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Tidak ada data absensi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Karyawan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check-in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check-out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durasi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((attendance) => (
                  <tr key={attendance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white font-medium">
                              {attendance.profiles?.full_name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {attendance.profiles?.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {attendance.profiles?.employee_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(attendance.check_in_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(attendance.check_out_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {calculateWorkDuration(attendance.check_in_time, attendance.check_out_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(attendance.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => viewDetail(attendance)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAttendance && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Detail Absensi</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Employee Info */}
                <div className="border-b pb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Informasi Karyawan</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Nama:</span>
                      <p className="font-medium">{selectedAttendance.profiles?.full_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">ID Karyawan:</span>
                      <p className="font-medium">{selectedAttendance.profiles?.employee_id}</p>
                    </div>
                  </div>
                </div>

                {/* Time Info */}
                <div className="border-b pb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Waktu Absensi</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Check-in:</span>
                      <p className="font-medium">
                        {selectedAttendance.check_in_time 
                          ? dayjs(selectedAttendance.check_in_time).format('HH:mm, DD MMM YYYY')
                          : 'Belum check-in'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Check-out:</span>
                      <p className="font-medium">
                        {selectedAttendance.check_out_time 
                          ? dayjs(selectedAttendance.check_out_time).format('HH:mm, DD MMM YYYY')
                          : 'Belum check-out'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Menit:</span>
                      <p className="font-medium">{selectedAttendance.total_minutes || 0} menit</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <div className="mt-1">{getStatusBadge(selectedAttendance.status)}</div>
                    </div>
                  </div>
                </div>

                {/* Location Info */}
                {(selectedAttendance.check_in_location || selectedAttendance.check_out_location) && (
                  <div className="border-b pb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Lokasi</h4>
                    <div className="space-y-2 text-sm">
                      {selectedAttendance.check_in_location && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-gray-500">Check-in:</span>
                          <span className="ml-2">Koordinat tersimpan</span>
                        </div>
                      )}
                      {selectedAttendance.check_out_location && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-red-500 mr-2" />
                          <span className="text-gray-500">Check-out:</span>
                          <span className="ml-2">Koordinat tersimpan</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Selfies */}
                {(selectedAttendance.check_in_selfie_url || selectedAttendance.check_out_selfie_url) && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Foto Selfie</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedAttendance.check_in_selfie_url && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Check-in</p>
                          <img 
                            src={selectedAttendance.check_in_selfie_url} 
                            alt="Check-in selfie"
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                      {selectedAttendance.check_out_selfie_url && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Check-out</p>
                          <img 
                            src={selectedAttendance.check_out_selfie_url} 
                            alt="Check-out selfie"
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedAttendance.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Catatan</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedAttendance.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAttendance
