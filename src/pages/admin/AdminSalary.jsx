// src/pages/admin/AdminSalary.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { 
  DollarSign, 
  FileText, 
  Plus, 
  Check, 
  X, 
  Clock,
  Download,
  AlertCircle,
  Users,
  Calendar
} from 'lucide-react'
import dayjs from 'dayjs'

const AdminSalary = () => {
  const [activeTab, setActiveTab] = useState('salary-slips')
  const [salarySlips, setSalarySlips] = useState([])
  const [pendingBonuses, setPendingBonuses] = useState([])
  const [employees, setEmployees] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1)
  const [selectedYear, setSelectedYear] = useState(dayjs().year())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchSalarySlips(),
        fetchPendingBonuses(),
        fetchEmployees()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSalarySlips = async () => {
    const { data, error } = await supabase
      .from('salary_slips')
      .select(`
        *,
        profiles:user_id(full_name, employee_id)
      `)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) {
      console.error('Error fetching salary slips:', error)
      return
    }
    setSalarySlips(data || [])
  }

  const fetchPendingBonuses = async () => {
    const { data, error } = await supabase
      .from('bonus_pending')
      .select(`
        *,
        from_profile:profiles!bonus_pending_from_user_id_fkey(full_name, employee_id),
        to_profile:profiles!bonus_pending_to_user_id_fkey(full_name, employee_id)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending bonuses:', error)
      return
    }
    setPendingBonuses(data || [])
  }

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id, base_salary, rate_per_minute')
      .eq('role', 'employee')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching employees:', error)
      return
    }
    setEmployees(data || [])
  }

  const handleBonusApproval = async (bonusId, approved, adminNotes = '') => {
    try {
      const { data: bonusData, error: fetchError } = await supabase
        .from('bonus_pending')
        .select('*')
        .eq('id', bonusId)
        .single()

      if (fetchError) throw fetchError

      if (approved) {
        // Approve bonus
        const { error: updateError } = await supabase
          .from('bonus_pending')
          .update({
            status: 'approved',
            admin_notes: adminNotes,
            approved_by: (await supabase.auth.getUser()).data.user.id,
            approved_at: new Date().toISOString()
          })
          .eq('id', bonusId)

        if (updateError) throw updateError

        // Add to bonus_approved
        const { error: insertError } = await supabase
          .from('bonus_approved')
          .insert({
            user_id: bonusData.to_user_id,
            bonus_minutes: bonusData.late_minutes,
            date: bonusData.date,
            source_bonus_id: bonusId
          })

        if (insertError) throw insertError

        toast.success('Bonus berhasil disetujui!')
      } else {
        // Reject bonus
        const { error } = await supabase
          .from('bonus_pending')
          .update({
            status: 'rejected',
            admin_notes: adminNotes,
            approved_by: (await supabase.auth.getUser()).data.user.id,
            approved_at: new Date().toISOString()
          })
          .eq('id', bonusId)

        if (error) throw error
        toast.success('Bonus ditolak!')
      }

      await fetchPendingBonuses()
    } catch (error) {
      console.error('Error handling bonus approval:', error)
      toast.error('Gagal memproses bonus')
    }
  }

  const generateSalarySlips = async () => {
    try {
      setIsLoading(true)

      for (const employee of employees) {
        // Get attendance data for the month
        const startDate = dayjs().year(selectedYear).month(selectedMonth - 1).startOf('month').format('YYYY-MM-DD')
        const endDate = dayjs().year(selectedYear).month(selectedMonth - 1).endOf('month').format('YYYY-MM-DD')

        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('total_minutes')
          .eq('user_id', employee.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .eq('status', 'completed')

        const totalWorkMinutes = attendanceData?.reduce((sum, att) => sum + (att.total_minutes || 0), 0) || 0

        // Get approved bonus for the month
        const { data: bonusData } = await supabase
          .from('bonus_approved')
          .select('bonus_minutes')
          .eq('user_id', employee.id)
          .gte('date', startDate)
          .lte('date', endDate)

        const totalBonusMinutes = bonusData?.reduce((sum, bonus) => sum + (bonus.bonus_minutes || 0), 0) || 0

        // Check if slip already exists
        const { data: existingSlip } = await supabase
          .from('salary_slips')
          .select('id')
          .eq('user_id', employee.id)
          .eq('month', selectedMonth)
          .eq('year', selectedYear)
          .single()

        if (existingSlip) {
          // Update existing slip
          await supabase
            .from('salary_slips')
            .update({
              total_work_minutes: totalWorkMinutes,
              total_bonus_minutes: totalBonusMinutes,
              base_salary: employee.base_salary,
              rate_per_minute: employee.rate_per_minute
            })
            .eq('id', existingSlip.id)
        } else {
          // Create new slip
          await supabase
            .from('salary_slips')
            .insert({
              user_id: employee.id,
              month: selectedMonth,
              year: selectedYear,
              total_work_minutes: totalWorkMinutes,
              total_bonus_minutes: totalBonusMinutes,
              base_salary: employee.base_salary,
              rate_per_minute: employee.rate_per_minute,
              status: 'draft'
            })
        }
      }

      toast.success('Slip gaji berhasil digenerate!')
      setShowGenerateModal(false)
      await fetchSalarySlips()
    } catch (error) {
      console.error('Error generating salary slips:', error)
      toast.error('Gagal generate slip gaji')
    } finally {
      setIsLoading(false)
    }
  }

  const finalizeSalarySlip = async (slipId) => {
    try {
      const { error } = await supabase
        .from('salary_slips')
        .update({
          status: 'finalized',
          finalized_by: (await supabase.auth.getUser()).data.user.id,
          finalized_at: new Date().toISOString()
        })
        .eq('id', slipId)

      if (error) throw error
      
      toast.success('Slip gaji berhasil difinalisasi!')
      await fetchSalarySlips()
    } catch (error) {
      console.error('Error finalizing salary slip:', error)
      toast.error('Gagal finalisasi slip gaji')
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      finalized: { bg: 'bg-green-100', text: 'text-green-800', label: 'Final' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Terkirim' }
    }
    
    const config = statusConfig[status] || statusConfig.draft
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kelola Gaji</h1>
            <p className="text-gray-600 mt-1">Manajemen slip gaji dan bonus karyawan</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Generate Slip Gaji
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('salary-slips')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'salary-slips'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-5 w-5 inline mr-2" />
              Slip Gaji ({salarySlips.length})
            </button>
            <button
              onClick={() => setActiveTab('bonus-approval')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bonus-approval'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <AlertCircle className="h-5 w-5 inline mr-2" />
              Bonus Pending ({pendingBonuses.length})
            </button>
          </nav>
        </div>

        {/* Salary Slips Tab */}
        {activeTab === 'salary-slips' && (
          <div className="p-6">
            {salarySlips.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Belum ada slip gaji</p>
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
                        Periode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Menit Kerja
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bonus Menit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Gaji
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
                    {salarySlips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {slip.profiles?.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {slip.profiles?.employee_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {dayjs().month(slip.month - 1).format('MMMM')} {slip.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {slip.total_work_minutes?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {slip.total_bonus_minutes?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Rp {slip.total_salary?.toLocaleString('id-ID') || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(slip.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {slip.status === 'draft' && (
                              <button
                                onClick={() => finalizeSalarySlip(slip.id)}
                                className="text-green-600 hover:text-green-900 flex items-center"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Finalisasi
                              </button>
                            )}
                            {slip.pdf_url && (
                              <a
                                href={slip.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900 flex items-center"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Bonus Approval Tab */}
        {activeTab === 'bonus-approval' && (
          <div className="p-6">
            {pendingBonuses.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Tidak ada bonus yang pending</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingBonuses.map((bonus) => (
                  <div key={bonus.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <Users className="h-8 w-8 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Bonus untuk: <span className="text-blue-600">{bonus.to_profile?.full_name}</span>
                            </p>
                            <p className="text-sm text-gray-500">
                              Dari keterlambatan: <span className="text-red-600">{bonus.from_profile?.full_name}</span>
                            </p>
                            <p className="text-sm text-gray-500">
                              Tanggal: {dayjs(bonus.date).format('DD MMMM YYYY')}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Menit Keterlambatan:</span>
                            <p className="font-medium">{bonus.late_minutes} menit</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Alasan:</span>
                            <p className="font-medium">{bonus.reason}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleBonusApproval(bonus.id, true, 'Disetujui oleh admin')}
                            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Setuju
                          </button>
                          <button
                            onClick={() => handleBonusApproval(bonus.id, false, 'Ditolak oleh admin')}
                            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Tolak
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Slip Gaji</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bulan</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {dayjs().month(i).format('MMMM')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tahun</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = dayjs().year() - 2 + i
                      return (
                        <option key={year} value={year}>{year}</option>
                      )
                    })}
                  </select>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Sistem akan menghitung total menit kerja dan bonus untuk periode yang dipilih.
                    {employees.length} karyawan akan diproses.
                  </p>
                </div>
              </div>

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={generateSalarySlips}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Memproses...' : 'Generate'}
                </button>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSalary
