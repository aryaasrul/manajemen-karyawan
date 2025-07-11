import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-hot-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Wifi, 
  Smartphone, 
  Camera,
  Eye,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import dayjs from 'dayjs';

const AdminApprovalDashboard = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();

  const fetchPendingApprovals = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_approval_queue')
        .select(`
          *,
          attendance:attendance_id (
            *,
            profile:user_id (full_name, employee_id)
          )
        `)
        .eq('requires_manual_review', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingApprovals(data || []);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast.error('Gagal memuat data approval.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  const handleApproval = async (queueItem, approve) => {
    if (!user) {
      toast.error('Anda harus login untuk melakukan aksi ini.');
      return;
    }

    const reason = approve ? 'Disetujui oleh admin' : prompt('Masukkan alasan penolakan:');
    if (!approve && !reason) {
      toast.error('Alasan penolakan wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Update the attendance record itself
      const { error: attendanceError } = await supabase
        .from('attendance')
        .update({
          approval_status: approve ? 'approved' : 'rejected',
          rejection_reason: approve ? null : reason,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', queueItem.attendance_id);

      if (attendanceError) throw attendanceError;

      // 2. Update the queue item to mark as reviewed
      const { error: queueError } = await supabase
        .from('attendance_approval_queue')
        .update({
          requires_manual_review: false,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reason,
        })
        .eq('id', queueItem.id);

      if (queueError) throw queueError;

      toast.success(`Absensi berhasil ${approve ? 'disetujui' : 'ditolak'}.`);
      setSelectedAttendance(null);
      await fetchPendingApprovals(); // Refresh the list

    } catch (error) {
      console.error('Error handling approval:', error);
      toast.error('Terjadi kesalahan saat memproses approval.');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityBadge = (priority) => {
    const colors = { 1: 'bg-green-100 text-green-800', 2: 'bg-yellow-100 text-yellow-800', 3: 'bg-red-100 text-red-800' };
    const labels = { 1: 'Rendah', 2: 'Sedang', 3: 'Tinggi' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority]}`}>{labels[priority]}</span>;
  };

  const ValidationFlag = ({ valid, label, icon: Icon }) => (
    <div className={`flex items-center space-x-2 p-2 rounded-md ${valid ? 'bg-green-50' : 'bg-red-50'}`}>
      <Icon className={`h-4 w-4 ${valid ? 'text-green-600' : 'text-red-600'}`} />
      <span className={`text-sm ${valid ? 'text-green-800' : 'text-red-800'}`}>{label}: {valid ? 'Valid' : 'Invalid'}</span>
    </div>
  );

  const filteredApprovals = pendingApprovals.filter(item => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'high_priority') return item.priority === 3;
    if (selectedFilter === 'low_score') return item.auto_validation_score < 60;
    if (selectedFilter === 'check_in') return item.submission_type === 'check_in';
    if (selectedFilter === 'check_out') return item.submission_type === 'check_out';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Approval Absensi</h1>
            <p className="text-gray-600 mt-1">Review dan setujui absensi yang memerlukan validasi manual.</p>
          </div>
          <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${pendingApprovals.length} Pending`}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'high_priority', label: 'Prioritas Tinggi' },
            { key: 'low_score', label: 'Skor Rendah (<60)' },
            { key: 'check_in', label: 'Check In' },
            { key: 'check_out', label: 'Check Out' }
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setSelectedFilter(key)} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedFilter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approval List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Antrian Persetujuan</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {isLoading && filteredApprovals.length === 0 ? (
              <div className="p-8 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
            ) : filteredApprovals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Tidak ada data untuk direview.</div>
            ) : (
              filteredApprovals.map((item) => (
                <div key={item.id} onClick={() => setSelectedAttendance(item)} className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedAttendance?.id === item.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">{item.attendance?.profile?.full_name}</span>
                        <span className="text-sm text-gray-500">({item.attendance?.profile?.employee_id})</span>
                        {getPriorityBadge(item.priority)}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {item.submission_type === 'check_in' ? 'Check In' : 'Check Out'} • {' '}
                        {dayjs(item.created_at).format('DD MMM YYYY, HH:mm')}
                      </div>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className={`font-medium ${getScoreColor(item.auto_validation_score)}`}>Skor: {item.auto_validation_score}%</span>
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-lg shadow-sm">
          {selectedAttendance ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Detail Absensi</h3>
                <div className="flex space-x-2">
                  <button onClick={() => handleApproval(selectedAttendance, true)} className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"><CheckCircle className="h-4 w-4 mr-1" />Setujui</button>
                  <button onClick={() => handleApproval(selectedAttendance, false)} className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"><XCircle className="h-4 w-4 mr-1" />Tolak</button>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                {/* Employee Info, Validation Score, Flags, etc. */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-gray-900 mb-2">Informasi Karyawan</h4>
                    <p className="text-sm"><span className="text-gray-500">Nama:</span> {selectedAttendance.attendance?.profile?.full_name}</p>
                    <p className="text-sm"><span className="text-gray-500">Waktu:</span> {dayjs(selectedAttendance.created_at).format('DD MMM YYYY, HH:mm')}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Skor Validasi</h4>
                    <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${getScoreColor(selectedAttendance.auto_validation_score).replace('text', 'bg')}`} style={{ width: `${selectedAttendance.auto_validation_score}%` }}></div></div>
                        <span className={`font-bold ${getScoreColor(selectedAttendance.auto_validation_score)}`}>{selectedAttendance.auto_validation_score}%</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Status Validasi</h4>
                    <ValidationFlag valid={selectedAttendance.validation_flags.location?.isValid} label="Lokasi" icon={MapPin} />
                    <ValidationFlag valid={selectedAttendance.validation_flags.wifi?.isApproved} label="WiFi" icon={Wifi} />
                    <ValidationFlag valid={selectedAttendance.validation_flags.device?.isRegistered} label="Device" icon={Smartphone} />
                    <ValidationFlag valid={selectedAttendance.validation_flags.workHours?.isWithinHours} label="Jam Kerja" icon={Clock} />
                </div>
                 <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Foto Selfie</h4>
                  <div className="flex items-center justify-center">
                    <img src={selectedAttendance.attendance[`${selectedAttendance.submission_type}_selfie_url`]} alt="Selfie absensi" className="w-32 h-32 rounded-lg border object-cover"/>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center"><Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p>Pilih absensi untuk melihat detail</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminApprovalDashboard;
