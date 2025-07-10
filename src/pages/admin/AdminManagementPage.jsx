import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  MapPin, 
  Wifi, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Building, 
  Radio,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminManagementPage = () => {
  const [activeTab, setActiveTab] = useState('locations');
  const [locations, setLocations] = useState([]);
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadLocations(),
        loadWifiNetworks(),
        loadDevices()
      ]);
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from('whitelist_locations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setLocations(data || []);
  };

  const loadWifiNetworks = async () => {
    const { data, error } = await supabase
      .from('approved_wifi_networks')
      .select('*, whitelist_locations(location_name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setWifiNetworks(data || []);
  };

  const loadDevices = async () => {
    const { data, error } = await supabase
      .from('approved_devices')
      .select('*, profiles(full_name, employee_id)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setDevices(data || []);
  };

  const LocationModal = ({ isOpen, onClose, location = null }) => {
    const [formData, setFormData] = useState({
      location_name: '',
      latitude: '',
      longitude: '',
      radius_meters: '100',
      wifi_ssid: ''
    });

    useEffect(() => {
      if (location) {
        setFormData({
          location_name: location.location_name || '',
          latitude: location.latitude?.toString() || '',
          longitude: location.longitude?.toString() || '',
          radius_meters: location.radius_meters?.toString() || '100',
          wifi_ssid: location.wifi_ssid?.join(', ') || ''
        });
      } else {
        setFormData({
          location_name: '',
          latitude: '',
          longitude: '',
          radius_meters: '100',
          wifi_ssid: ''
        });
      }
    }, [location]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
        const wifiArray = formData.wifi_ssid
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        const locationData = {
          location_name: formData.location_name,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius_meters: parseInt(formData.radius_meters),
          wifi_ssid: wifiArray,
          is_active: true,
          updated_at: new Date().toISOString()
        };

        if (location) {
          // Update existing
          const { error } = await supabase
            .from('whitelist_locations')
            .update(locationData)
            .eq('id', location.id);
          
          if (error) throw error;
          toast.success('Lokasi berhasil diperbarui');
        } else {
          // Create new
          locationData.created_at = new Date().toISOString();
          const { error } = await supabase
            .from('whitelist_locations')
            .insert([locationData]);
          
          if (error) throw error;
          toast.success('Lokasi berhasil ditambahkan');
        }

        await loadLocations();
        onClose();
      } catch (error) {
        console.error('Save location error:', error);
        toast.error('Gagal menyimpan lokasi');
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-h-screen overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {location ? 'Edit Lokasi' : 'Tambah Lokasi'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lokasi
              </label>
              <input
                type="text"
                required
                value={formData.location_name}
                onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Kantor Pusat"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="-6.2088"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="106.8456"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Radius (meter)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                required
                value={formData.radius_meters}
                onChange={(e) => setFormData(prev => ({ ...prev, radius_meters: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WiFi SSID (pisahkan dengan koma)
              </label>
              <input
                type="text"
                value={formData.wifi_ssid}
                onChange={(e) => setFormData(prev => ({ ...prev, wifi_ssid: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="WiFi_Kantor, WiFi_Guest"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                <Save className="h-4 w-4 inline mr-2" />
                Simpan
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 font-medium"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const WifiModal = ({ isOpen, onClose, wifi = null }) => {
    const [formData, setFormData] = useState({
      ssid: '',
      bssid: '',
      location_id: '',
      description: ''
    });

    useEffect(() => {
      if (wifi) {
        setFormData({
          ssid: wifi.ssid || '',
          bssid: wifi.bssid || '',
          location_id: wifi.location_id || '',
          description: wifi.description || ''
        });
      } else {
        setFormData({
          ssid: '',
          bssid: '',
          location_id: '',
          description: ''
        });
      }
    }, [wifi]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
        const wifiData = {
          ssid: formData.ssid,
          bssid: formData.bssid || null,
          location_id: formData.location_id || null,
          description: formData.description,
          is_active: true
        };

        if (wifi) {
          // Update existing
          const { error } = await supabase
            .from('approved_wifi_networks')
            .update(wifiData)
            .eq('id', wifi.id);
          
          if (error) throw error;
          toast.success('WiFi berhasil diperbarui');
        } else {
          // Create new
          const { error } = await supabase
            .from('approved_wifi_networks')
            .insert([wifiData]);
          
          if (error) throw error;
          toast.success('WiFi berhasil ditambahkan');
        }

        await loadWifiNetworks();
        onClose();
      } catch (error) {
        console.error('Save wifi error:', error);
        toast.error('Gagal menyimpan WiFi');
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {wifi ? 'Edit WiFi' : 'Tambah WiFi'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SSID (Nama WiFi) *
              </label>
              <input
                type="text"
                required
                value={formData.ssid}
                onChange={(e) => setFormData(prev => ({ ...prev, ssid: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="WiFi_Kantor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BSSID (MAC Address Router)
              </label>
              <input
                type="text"
                value={formData.bssid}
                onChange={(e) => setFormData(prev => ({ ...prev, bssid: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="aa:bb:cc:dd:ee:ff"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lokasi
              </label>
              <select
                value={formData.location_id}
                onChange={(e) => setFormData(prev => ({ ...prev, location_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Pilih Lokasi</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.location_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="WiFi utama kantor"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                <Save className="h-4 w-4 inline mr-2" />
                Simpan
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 font-medium"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleDeleteLocation = async (id) => {
    if (!confirm('Yakin ingin menghapus lokasi ini?')) return;
    
    try {
      const { error } = await supabase
        .from('whitelist_locations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Lokasi berhasil dihapus');
      await loadLocations();
    } catch (error) {
      console.error('Delete location error:', error);
      toast.error('Gagal menghapus lokasi');
    }
  };

  const handleDeleteWifi = async (id) => {
    if (!confirm('Yakin ingin menghapus WiFi ini?')) return;
    
    try {
      const { error } = await supabase
        .from('approved_wifi_networks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('WiFi berhasil dihapus');
      await loadWifiNetworks();
    } catch (error) {
      console.error('Delete wifi error:', error);
      toast.error('Gagal menghapus WiFi');
    }
  };

  const handleApproveDevice = async (deviceId, approved) => {
    try {
      const { error } = await supabase
        .from('approved_devices')
        .update({
          is_active: approved,
          approved_by: (await supabase.auth.getUser()).data.user.id,
          approved_at: approved ? new Date().toISOString() : null
        })
        .eq('id', deviceId);
      
      if (error) throw error;
      
      toast.success(`Device berhasil ${approved ? 'disetujui' : 'ditolak'}`);
      await loadDevices();
    } catch (error) {
      console.error('Approve device error:', error);
      toast.error('Gagal memproses persetujuan device');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Sistem</h1>
        <p className="text-gray-600 mt-1">Kelola lokasi, WiFi, dan device untuk validasi absensi</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'locations', label: 'Lokasi', icon: MapPin },
              { key: 'wifi', label: 'WiFi Networks', icon: Wifi },
              { key: 'devices', label: 'Devices', icon: Radio }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Locations Tab */}
          {activeTab === 'locations' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Whitelist Lokasi</h2>
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Lokasi
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map(location => (
                  <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{location.location_name}</h3>
                        <p className="text-sm text-gray-500">
                          {location.latitude}, {location.longitude}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            setEditingItem(location);
                            setShowLocationModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(location.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Radius:</span>
                        <span className="font-medium">{location.radius_meters}m</span>
                      </div>
                      <div>
                        <span className="text-gray-600">WiFi:</span>
                        <div className="mt-1">
                          {location.wifi_ssid?.length > 0 ? (
                            location.wifi_ssid.map((ssid, index) => (
                              <span key={index} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1 mb-1">
                                {ssid}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">Tidak ada</span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium ${location.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {location.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {locations.length === 0 && (
                <div className="text-center py-12">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Belum ada lokasi yang ditambahkan</p>
                </div>
              )}
            </div>
          )}

          {/* WiFi Networks Tab */}
          {activeTab === 'wifi' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">WiFi Networks</h2>
                <button
                  onClick={() => setShowWifiModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah WiFi
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SSID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        BSSID
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
                          {wifi.bssid || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {wifi.whitelist_locations?.location_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {wifi.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            wifi.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {wifi.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingItem(wifi);
                                setShowWifiModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteWifi(wifi.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {wifiNetworks.length === 0 && (
                <div className="text-center py-12">
                  <Wifi className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Belum ada WiFi network yang ditambahkan</p>
                </div>
              )}
            </div>
          )}

          {/* Devices Tab */}
          {activeTab === 'devices' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Device Management</h2>
                <div className="text-sm text-gray-500">
                  Total: {devices.length} devices
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Karyawan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fingerprint
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Terakhir Seen
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {device.profiles?.full_name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {device.profiles?.employee_id || 'No ID'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Radio className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{device.device_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {device.device_fingerprint.substring(0, 12)}...
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(device.last_seen).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            device.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {device.is_active ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {!device.is_active ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApproveDevice(device.id, true)}
                                className="text-green-600 hover:text-green-700 flex items-center"
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleApproveDevice(device.id, false)}
                                className="text-red-600 hover:text-red-700 flex items-center"
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleApproveDevice(device.id, false)}
                              className="text-red-600 hover:text-red-700 flex items-center"
                              title="Revoke Approval"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {devices.length === 0 && (
                <div className="text-center py-12">
                  <Radio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Belum ada device yang terdaftar</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <LocationModal
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false);
          setEditingItem(null);
        }}
        location={editingItem}
      />

      <WifiModal
        isOpen={showWifiModal}
        onClose={() => {
          setShowWifiModal(false);
          setEditingItem(null);
        }}
        wifi={editingItem}
      />
    </div>
  );
};

export default AdminManagementPage;