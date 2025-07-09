// src/pages/admin/AdminEmployees.jsx - Fix tanpa Admin API
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  UserCheck, 
  UserX,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ExternalLink
} from 'lucide-react'
import dayjs from 'dayjs'

const AdminEmployees = () => {
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    employee_id: '',
    phone: '',
    hire_date: '',
    base_salary: 750000,
    work_minutes_per_day: 240,
    role: 'employee'
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    // Filter employees based on search term
    const filtered = employees.filter(emp => 
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredEmployees(filtered)
  }, [employees, searchTerm])

  const fetchEmployees = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          full_name, 
          employee_id, 
          role, 
          phone, 
          hire_date, 
          base_salary, 
          work_minutes_per_day, 
          rate_per_minute, 
          is_active,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Gagal memuat data karyawan')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingEmployee) {
        // Update existing employee
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            hire_date: formData.hire_date,
            base_salary: formData.base_salary,
            work_minutes_per_day: formData.work_minutes_per_day,
            role: formData.role
          })
          .eq('id', editingEmployee.id)

        if (error) throw error
        toast.success('Karyawan berhasil diupdate!')
      } else {
        // Method baru: Generate invite link instead of creating user directly
        toast.success(`Invitation details untuk ${formData.full_name}:`)
        toast.success(`Email: ${formData.email}`)
        toast.success(`Password: ${formData.password}`)
        toast.success(`Employee ID: ${formData.employee_id}`)
        
        // Tampilkan modal dengan instruksi untuk user registration manual
        setShowInviteModal(true)
        return
      }

      await fetchEmployees()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving employee:', error)
      toast.error(error.message || 'Gagal menyimpan data karyawan')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (employee) => {
    if (!confirm(`Yakin ingin menghapus karyawan ${employee.full_name}?`)) return

    try {
      // Soft delete - set is_active to false
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', employee.id)

      if (error) throw error

      toast.success('Karyawan berhasil dihapus!')
      await fetchEmployees()
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast.error('Gagal menghapus karyawan')
    }
  }

  const handleEdit = (employee) => {
    setEditingEmployee(employee)
    setFormData({
      email: '',
      password: '',
      full_name: employee.full_name,
      employee_id: employee.employee_id,
      phone: employee.phone || '',
      hire_date: employee.hire_date || '',
      base_salary: employee.base_salary,
      work_minutes_per_day: employee.work_minutes_per_day,
      role: employee.role
    })
    setShowAddModal(true)
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setEditingEmployee(null)
    setFormData({
      email: '',
      password: '',
      full_name: '',
      employee_id: '',
      phone: '',
      hire_date: '',
      base_salary: 750000,
      work_minutes_per_day: 240,
      role: 'employee'
    })
  }

  // Method untuk manual user creation
  const createUserManually = async () => {
    try {
      // Step 1: User perlu sign up manual via auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Email sudah terdaftar. Gunakan email lain.')
        } else {
          throw authError
        }
        return
      }

      if (authData.user) {
        // Step 2: Create profile untuk user tersebut
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: formData.full_name,
            employee_id: formData.employee_id,
            phone: formData.phone,
            hire_date: formData.hire_date,
            base_salary: formData.base_salary,
            work_minutes_per_day: formData.work_minutes_per_day,
            role: formData.role
          })

        if (profileError) throw profileError

        toast.success('Karyawan berhasil ditambahkan!')
        await fetchEmployees()
        handleCloseModal()
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error(error.message || 'Gagal membuat user')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kelola Karyawan</h1>
            <p className="text-gray-600 mt-1">Manajemen data karyawan dan registrasi user baru</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Tambah Karyawan
          </button>
        </div>
      </div>

      {/* Instructions untuk Admin */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExternalLink className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Cara Menambah Karyawan Baru
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>1. Isi form data karyawan</p>
              <p>2. Karyawan akan mendapat email dan password untuk login</p>
              <p>3. Karyawan bisa langsung login dengan credentials tersebut</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari karyawan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Daftar Karyawan ({filteredEmployees.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Memuat data...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'Tidak ada karyawan yang cocok dengan pencarian' : 'Belum ada karyawan'}
            </p>
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
                    Kontak
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detail Kerja
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
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white font-medium">
                              {employee.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {employee.employee_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.phone && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {employee.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {employee.hire_date ? dayjs(employee.hire_date).format('DD MMM YYYY') : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                        Rp {employee.base_salary?.toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {employee.is_active ? (
                          <>
                            <UserCheck className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-sm text-green-600">Aktif</span>
                          </>
                        ) : (
                          <>
                            <UserX className="h-4 w-4 text-red-500 mr-2" />
                            <span className="text-sm text-red-600">Nonaktif</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Role: {employee.role}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(employee)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingEmployee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingEmployee && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Minimal 6 karakter"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Karyawan</label>
                  <input
                    type="text"
                    required
                    disabled={editingEmployee}
                    value={formData.employee_id}
                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    placeholder="EMP001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Nomor Telepon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tanggal Bergabung</label>
                  <input
                    type="date"
                    required
                    value={formData.hire_date}
                    onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Gaji Pokok (Rp)</label>
                  <input
                    type="number"
                    required
                    value={formData.base_salary}
                    onChange={(e) => setFormData({...formData, base_salary: Number(e.target.value)})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Menit Kerja per Hari</label>
                  <input
                    type="number"
                    required
                    value={formData.work_minutes_per_day}
                    onChange={(e) => setFormData({...formData, work_minutes_per_day: Number(e.target.value)})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex space-x-4 pt-4">
                  {editingEmployee ? (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Menyimpan...' : 'Update'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={createUserManually}
                      disabled={isLoading}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Membuat...' : 'Tambah Karyawan'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminEmployees