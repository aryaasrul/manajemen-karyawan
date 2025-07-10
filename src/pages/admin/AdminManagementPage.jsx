import React, { useState } from 'react';
import { 
  Settings, 
  MapPin, 
  Wifi, 
  Radio, 
  Plus,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';

const AdminManagementPage = () => {
  const [activeTab, setActiveTab] = useState('locations');
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock data - replace with real data later
  const [locations] = useState([
    {
      id: 1,
      name: 'Kantor Pusat',
      latitude: -6.2088,
      longitude: 106.8456,
      radius: 100,
      isActive: true
    },
    {
      id: 2,
      name: 'Cabang Jakarta',
      latitude: -6.1751,
      longitude: 106.8650,
      radius: 150,
      isActive: true
    }
  ]);

  const [wifiNetworks] = useState([
    {
      id: 1,
      ssid: 'OfficeWiFi_Main',
      description: 'WiFi utama kantor',
      location: 'Kantor Pusat',
      isActive: true
    },
    {
      id: 2,
      ssid: 'OfficeWiFi_Guest',
      description: 'WiFi tamu',
      location: 'Kantor Pusat',
      isActive: true
    }
  ]);

  const [devices] = useState([
    {
      id: 1,
      employeeName: 'John Doe',
      deviceName: 'iPhone 13',
      fingerprint: 'abc123def456',
      lastSeen: '2025-01-10',
      status: 'approved'
    },
    {
      id: 2,
      employeeName: 'Jane Smith',
      deviceName: 'Samsung Galaxy',
      fingerprint: 'xyz789uvw012',
      lastSeen: '2025-01-09',
      status: 'pending'
    }
  ]);

  const TabButton = ({ id, label, icon: Icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </button>
  );

  const LocationsTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Whitelist Lokasi</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Lokasi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(location => (
          <div key={location.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-gray-900">{location.name}</h3>
                <p className="text-sm text-gray-500">
                  {location.latitude}, {location.longitude}
                </p>
              </div>
              <div className="flex space-x-1">
                <button className="text-blue-600 hover:text-blue-700">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Radius:</span>
                <span className="font-medium">{location.radius}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${location.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {location.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const WiFiTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">WiFi Networks</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah WiFi
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SSID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lokasi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deskripsi
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
            {wifiNetworks.map(wifi => (
              <tr key={wifi.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Wifi className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">{wifi.ssid}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {wifi.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {wifi.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    wifi.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {wifi.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-700">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const DevicesTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Device Management</h2>
        <div className="text-sm text-gray-500">
          Total: {devices.length} devices
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Karyawan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Device
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fingerprint
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Seen
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
            {devices.map(device => (
              <tr key={device.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {device.employeeName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Radio className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{device.deviceName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {device.fingerprint.substring(0, 12)}...
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {device.lastSeen}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    device.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {device.status === 'approved' ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {device.status === 'pending' ? (
                    <div className="flex space-x-2">
                      <button className="text-green-600 hover:text-green-700">
                        Approve
                      </button>
                      <button className="text-red-600 hover:text-red-700">
                        Reject
                      </button>
                    </div>
                  ) : (
                    <button className="text-red-600 hover:text-red-700">
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Sistem</h1>
        <p className="text-gray-600 mt-1">Kelola lokasi, WiFi, dan device untuk validasi absensi</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex space-x-4 mb-6">
          <TabButton
            id="locations"
            label="Lokasi"
            icon={MapPin}
            isActive={activeTab === 'locations'}
            onClick={() => setActiveTab('locations')}
          />
          <TabButton
            id="wifi"
            label="WiFi Networks"
            icon={Wifi}
            isActive={activeTab === 'wifi'}
            onClick={() => setActiveTab('wifi')}
          />
          <TabButton
            id="devices"
            label="Devices"
            icon={Radio}
            isActive={activeTab === 'devices'}
            onClick={() => setActiveTab('devices')}
          />
        </div>

        {/* Tab Content */}
        {activeTab === 'locations' && <LocationsTab />}
        {activeTab === 'wifi' && <WiFiTab />}
        {activeTab === 'devices' && <DevicesTab />}
      </div>

      {/* Add Modal Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tambah {activeTab}</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-center py-8">
              <p className="text-gray-500">Form will be implemented here</p>
              <button
                onClick={() => setShowAddModal(false)}
                className="mt-4 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagementPage;