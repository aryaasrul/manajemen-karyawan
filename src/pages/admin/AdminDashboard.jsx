import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Clock, DollarSign, Calendar, AlertCircle, Settings } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeToday: 0,
    pendingBonuses: 0,
    monthlyPayroll: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const currentMonth = dayjs().month() + 1;
      const currentYear = dayjs().year();

      const [
        employeesRes,
        todayAttendanceRes,
        pendingBonusesRes,
        salarySlipsRes,
        recentActivityRes
      ] = await Promise.all([
        supabase.from('profiles').select('id, role', { count: 'exact' }).eq('is_active', true),
        supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today),
        supabase.from('bonus_pending').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('salary_slips').select('total_salary').eq('month', currentMonth).eq('year', currentYear),
        supabase.from('attendance').select('id, check_in_time, check_out_time, total_minutes, profiles(full_name, employee_id)').order('created_at', { ascending: false }).limit(5)
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (todayAttendanceRes.error) throw todayAttendanceRes.error;
      if (pendingBonusesRes.error) throw pendingBonusesRes.error;
      if (salarySlipsRes.error) throw salarySlipsRes.error;
      if (recentActivityRes.error) throw recentActivityRes.error;
      
      setStats({
        totalEmployees: employeesRes.data?.filter(emp => emp.role === 'employee').length || 0,
        activeToday: todayAttendanceRes.count || 0,
        pendingBonuses: pendingBonusesRes.count || 0,
        monthlyPayroll: salarySlipsRes.data?.reduce((sum, slip) => sum + Number(slip.total_salary), 0) || 0
      });

      setRecentActivity(recentActivityRes.data || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error("Gagal memuat data dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center">
        <div className={`w-12 h-12 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4">
          <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
          <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Ringkasan sistem manajemen karyawan - {dayjs().format('dddd, DD MMMM YYYY')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Karyawan" value={stats.totalEmployees} icon={Users} color="bg-blue-500" />
        <StatCard title="Hadir Hari Ini" value={stats.activeToday} icon={Clock} color="bg-green-500" />
        <StatCard title="Approval Pending" value={stats.pendingBonuses} icon={AlertCircle} color="bg-yellow-500" />
        <StatCard title="Payroll Bulan Ini" value={`Rp ${stats.monthlyPayroll.toLocaleString('id-ID')}`} icon={DollarSign} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h3>
          </div>
          <div className="p-6">
            {recentActivity.length > 0 ? (
              <ul className="space-y-4">
                {recentActivity.map((activity) => (
                  <li key={activity.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0"><div className="w-2 h-2 bg-green-400 rounded-full"></div></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.profiles?.full_name}</p>
                      <p className="text-sm text-gray-500">{activity.check_out_time ? 'Check-out' : 'Check-in'} pada {dayjs(activity.check_in_time).format('HH:mm')}</p>
                    </div>
                    <div className="text-sm text-gray-500">{activity.total_minutes || 0} menit</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-4">Belum ada aktivitas hari ini.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Aksi Cepat</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="/admin/employees" className="flex items-center p-4 border rounded-lg hover:bg-gray-50"><Users className="h-6 w-6 text-blue-500 mr-3" /><div><p className="font-medium">Kelola Karyawan</p></div></a>
            <a href="/admin/attendance" className="flex items-center p-4 border rounded-lg hover:bg-gray-50"><Clock className="h-6 w-6 text-green-500 mr-3" /><div><p className="font-medium">Monitor Absensi</p></div></a>
            <a href="/admin/salary" className="flex items-center p-4 border rounded-lg hover:bg-gray-50"><DollarSign className="h-6 w-6 text-purple-500 mr-3" /><div><p className="font-medium">Kelola Gaji</p></div></a>
            <a href="/admin/management" className="flex items-center p-4 border rounded-lg hover:bg-gray-50"><Settings className="h-6 w-6 text-gray-600 mr-3" /><div><p className="font-medium">Manajemen Sistem</p></div></a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
