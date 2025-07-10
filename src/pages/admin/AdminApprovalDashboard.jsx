import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Wifi, 
  Smartphone, 
  Camera,
  Eye,
  AlertTriangle
} from 'lucide-react';

const AdminApprovalDashboard = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedAttendance, setSelectedAttendance] = useState(null);

  // Mock data - replace with real data later
  const [pendingApprovals] = useState([
    {
      id: 1,
      employeeName: 'John Doe',
      employeeId: 'EMP001',
      type: 'check_in',
      submittedAt: '2025-01-10T08:30:00Z',
      validationScore: 65,
      priority: 2,
      location: {
        valid: true,
        name: 'Kantor Pusat',
        coordinates: '-6.2088, 106.8456'
      },
      wifi: {
        valid: false,
        ssid: 'UnknownWiFi'
      },
      device: {
        valid: false,
        fingerprint: 'abc123def456'
      },
      workHours: {
        valid: true,
        time: '08:30'
      },
      selfieUrl: 'https://via.placeholder.com/150'
    },
    {
      id: 2,
      employeeName: 'Jane Smith',
      employeeId: 'EMP002',
      type: 'check_out',
      submittedAt: '2025-01-10T17:45:00Z',
      validationScore: 35,
      priority: 3,
      location: {
        valid: false,
        name: 'Lokasi Tidak Dikenal',
        coordinates: '-6.3000, 106.9000'
      },
      wifi: {
        valid: false,
        ssid: null
      },
      device: {
        valid: true,
        fingerprint: 'xyz789uvw012'
      },
      workHours: {
        valid: false,
        time: '17:45'
      },
      selfieUrl: 'https://via.placeholder.com/150'
    }
  ]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-red-100 text-red-800'
    };
    const labels = { 1: 'Rendah', 2: 'Sedang', 3: 'Tinggi' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const ValidationFlag = ({ valid, label, icon: Icon }) => (
    <div className={`flex items-center space-x-2 p-2 rounded-md ${valid ? 'bg-green-50' : 'bg-red-50'}`}>
      <Icon className={`h-4 w-4 ${valid ? 'text-green-600' : 'text-red-600'}`} />
      <span className={`text-sm ${valid ? 'text-green-800' : 'text-red-800'}`}>
        {label}: {valid ? 'Valid' : 'Invalid'}
      </span>
    </div>
  );

  const handleApprove = (attendanceId) => {
    console.log('Approving attendance:', attendanceId);
    // TODO: Implement approval logic
    alert('Approval functionality will be implemented');
  };

  const handleReject = (attendanceId) => {
    console.log('Rejecting attendance:', attendanceId);
    // TODO: Implement rejection logic
    const reason = prompt('Masukkan alasan penolakan:');
    if (reason) {
      alert('Rejection functionality will be implemented');
    }
  };

  const filteredApprovals = pendingApprovals.filter(item => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'high_priority') return item.priority === 3;
    if (selectedFilter === 'low_score') return item.validationScore < 50;
    if (selectedFilter === 'check_in') return item.type === 'check_in';
    if (selectedFilter === 'check_out') return item.type === 'check_out';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Approval Absensi</h1>
            <p className="text-gray-600 mt-1">Review dan approve absensi karyawan</p>
          </div>
          <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
            {pendingApprovals.length} Pending
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'high_priority', label: 'Prioritas Tinggi' },
            { key: 'low_score', label: 'Skor Rendah' },
            { key: 'check_in', label: 'Check In' },
            { key: 'check_out', label: 'Check Out' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedFilter(key)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedFilter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
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
            <h3 className="font-semibold text-gray-900">Pending Approvals</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredApprovals.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedAttendance(item)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedAttendance?.id === item.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-gray-900">{item.employeeName}</span>
                      <span className="text-sm text-gray-500">({item.employeeId})</span>
                      {getPriorityBadge(item.priority)}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {item.type === 'check_in' ? 'Check In' : 'Check Out'} • {' '}
                      {new Date(item.submittedAt).toLocaleString('id-ID')}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs">
                      <span className={`font-medium ${getScoreColor(item.validationScore)}`}>
                        Skor: {item.validationScore}%
                      </span>
                      <div className="flex space-x-1">
                        {item.location.valid && <MapPin className="h-3 w-3 text-green-600" />}
                        {item.wifi.valid && <Wifi className="h-3 w-3 text-green-600" />}
                        {item.device.valid && <Smartphone className="h-3 w-3 text-green-600" />}
                        {!item.location.valid && <MapPin className="h-3 w-3 text-red-600" />}
                        {!item.wifi.valid && <Wifi className="h-3 w-3 text-red-600" />}
                        {!item.device.valid && <Smartphone className="h-3 w-3 text-red-600" />}
                      </div>
                    </div>
                  </div>
                  
                  <Eye className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}

            {filteredApprovals.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Tidak ada approval yang perlu direview
              </div>
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
                  <button
                    onClick={() => handleApprove(selectedAttendance.id)}
                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedAttendance.id)}
                    className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </button>
                </div>
              </div>

              {/* Employee Info */}
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Informasi Karyawan</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Nama:</span>
                      <p className="font-medium">{selectedAttendance.employeeName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">ID:</span>
                      <p className="font-medium">{selectedAttendance.employeeId}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Tipe:</span>
                      <p className="font-medium">
                        {selectedAttendance.type === 'check_in' ? 'Check In' : 'Check Out'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Waktu:</span>
                      <p className="font-medium">
                        {new Date(selectedAttendance.submittedAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Validation Score */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Skor Validasi</h4>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          selectedAttendance.validationScore >= 80 ? 'bg-green-500' :
                          selectedAttendance.validationScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${selectedAttendance.validationScore}%` }}
                      ></div>
                    </div>
                    <span className={`font-bold ${getScoreColor(selectedAttendance.validationScore)}`}>
                      {selectedAttendance.validationScore}%
                    </span>
                  </div>
                </div>

                {/* Validation Flags */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Status Validasi</h4>
                  <ValidationFlag 
                    valid={selectedAttendance.location.valid} 
                    label="Lokasi" 
                    icon={MapPin} 
                  />
                  <ValidationFlag 
                    valid={selectedAttendance.wifi.valid} 
                    label="WiFi" 
                    icon={Wifi} 
                  />
                  <ValidationFlag 
                    valid={selectedAttendance.device.valid} 
                    label="Device" 
                    icon={Smartphone} 
                  />
                  <ValidationFlag 
                    valid={selectedAttendance.workHours.valid} 
                    label="Jam Kerja" 
                    icon={Clock} 
                  />
                </div>

                {/* Location Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Detail Lokasi</h4>
                  <div className="text-sm">
                    <p className="text-gray-600">{selectedAttendance.location.name}</p>
                    <p className="text-gray-500 text-xs">
                      {selectedAttendance.location.coordinates}
                    </p>
                  </div>
                </div>

                {/* WiFi Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Informasi WiFi</h4>
                  <div className="text-sm">
                    <p className="text-gray-600">
                      SSID: {selectedAttendance.wifi.ssid || 'Tidak terdeteksi'}
                    </p>
                    <p className={`text-xs ${selectedAttendance.wifi.valid ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedAttendance.wifi.valid ? 'WiFi Disetujui' : 'WiFi Tidak Disetujui'}
                    </p>
                  </div>
                </div>

                {/* Device Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Informasi Device</h4>
                  <div className="text-sm">
                    <p className="text-gray-600">
                      Fingerprint: {selectedAttendance.device.fingerprint.substring(0, 12)}...
                    </p>
                    <p className={`text-xs ${selectedAttendance.device.valid ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedAttendance.device.valid ? 'Device Terdaftar' : 'Device Belum Terdaftar'}
                    </p>
                  </div>
                </div>

                {/* Selfie */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Foto Selfie</h4>
                  <div className="flex items-center justify-center">
                    <img 
                      src={selectedAttendance.selfieUrl} 
                      alt="Selfie absensi"
                      className="w-32 h-32 rounded-lg border object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p>Pilih absensi untuk melihat detail</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{pendingApprovals.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Prioritas Tinggi</p>
              <p className="text-2xl font-semibold text-gray-900">
                {pendingApprovals.filter(item => item.priority === 3).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircle className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Skor Rendah</p>
              <p className="text-2xl font-semibold text-gray-900">
                {pendingApprovals.filter(item => item.validationScore < 50).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Rata-rata Skor</p>
              <p className="text-2xl font-semibold text-gray-900">
                {Math.round(pendingApprovals.reduce((acc, item) => acc + item.validationScore, 0) / pendingApprovals.length)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminApprovalDashboard;