import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabaseHelpers } from '../lib/supabase'
import { DollarSign, Download, Calendar, Clock } from 'lucide-react'
import dayjs from 'dayjs'

const SalaryPage = () => {
  const [salarySlips, setSalarySlips] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  const { user } = useAuthStore()

  useEffect(() => {
    if (user?.id) {
      fetchSalarySlips()
    }
  }, [user?.id])

  const fetchSalarySlips = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabaseHelpers.getSalarySlips(user.id)
      if (error) throw error
      setSalarySlips(data || [])
    } catch (error) {
      console.error('Error fetching salary slips:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      finalized: { bg: 'bg-success-100', text: 'text-success-800', label: 'Final' },
      sent: { bg: 'bg-primary-100', text: 'text-primary-800', label: 'Terkirim' }
    }
    
    const config = statusConfig[status] || statusConfig.draft
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Slip Gaji</h1>
        <p className="text-gray-600 mt-1">Riwayat dan detail gaji bulanan</p>
      </div>

      {/* Salary Slips List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Slip Gaji</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Memuat data...</p>
            </div>
          ) : salarySlips.length === 0 ? (
            <div className="p-6 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Belum ada slip gaji tersedia</p>
            </div>
          ) : (
            salarySlips.map((slip) => (
              <div key={slip.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900">
                        {dayjs().month(slip.month - 1).format('MMMM')} {slip.year}
                      </h3>
                      {getStatusBadge(slip.status)}
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Menit Kerja</p>
                        <p className="font-medium">{slip.total_work_minutes.toLocaleString()} menit</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Bonus Menit</p>
                        <p className="font-medium">{slip.total_bonus_minutes.toLocaleString()} menit</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Rate per Menit</p>
                        <p className="font-medium">Rp {slip.rate_per_minute.toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Gaji</p>
                        <p className="font-semibold text-primary-600">
                          Rp {slip.total_salary.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-6">
                    {slip.pdf_url && (
                      <a
                        href={slip.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default SalaryPage