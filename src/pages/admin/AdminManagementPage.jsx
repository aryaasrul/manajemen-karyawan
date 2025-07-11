import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-hot-toast';
import { Settings, MapPin, Wifi, Radio, Plus, Edit, Trash2, Save, X, Loader2, Check, Shield, Clock, ExternalLink, Search } from 'lucide-react';
// Pastikan Anda sudah menjalankan: npm install react-leaflet leaflet
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';

// Komponen untuk pemilih lokasi di peta
const LocationPickerModal = ({ isOpen, onClose, onLocationSelect, initialPosition }) => {
  const [position, setPosition] = useState(initialPosition || [-7.8629, 111.4611]); // Default ke Ponorogo
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef(null);

  const DraggableMarker = () => {
    const map = useMap();
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      },
    });

    useEffect(() => {
        map.setView(position, 15);
    }, [position, map]);

    return <Marker position={position} draggable={true} eventHandlers={{
        dragend: (e) => setPosition([e.target.getLatLng().lat, e.target.getLatLng().lng])
    }} />;
  };
  
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
        const data = await response.json();
        if (data && data.length > 0) {
            const { lat, lon } = data[0];
            setPosition([parseFloat(lat), parseFloat(lon)]);
        } else {
            toast.error('Lokasi tidak ditemukan.');
        }
    } catch (error) {
        toast.error('Gagal mencari lokasi.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-2xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Pilih Lokasi di Peta</h3>
            <button onClick={onClose}><X size={24}/></button>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari alamat atau nama tempat..." className="w-full input-field" />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><Search size={18}/></button>
        </form>
        <div className="flex-grow rounded-md overflow-hidden">
            <MapContainer center={position} zoom={13} ref={mapRef} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                <DraggableMarker />
            </MapContainer>
        </div>
        <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 mb-2">Koordinat terpilih: {position[0].toFixed(6)}, {position[1].toFixed(6)}</p>
            <button onClick={() => onLocationSelect(position)} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Konfirmasi Lokasi</button>
        </div>
      </div>
    </div>
  );
};


const AdminManagementPage = () => {
  const [activeTab, setActiveTab] = useState('locations');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  const [locations, setLocations] = useState([]);
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [devices, setDevices] = useState([]);
  const [generalSettings, setGeneralSettings] = useState({
    work_start_time: '09:00',
    work_end_time: '13:00',
    selfie_auto_delete_hours: '24'
  });
  
  const { user } = useAuthStore();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [locationsRes, wifiRes, devicesRes, settingsRes] = await Promise.all([
        supabase.from('whitelist_locations').select('*').order('created_at'),
        supabase.from('approved_wifi_networks').select('*, location:location_id(location_name)').order('created_at'),
        supabase.from('approved_devices').select('*, profile:user_id(full_name, employee_id)').order('last_seen', { ascending: false }),
        supabase.from('company_settings').select('key, value')
      ]);

      if (locationsRes.error) throw locationsRes.error;
      setLocations(locationsRes.data || []);

      if (wifiRes.error) throw wifiRes.error;
      setWifiNetworks(wifiRes.data || []);

      if (devicesRes.error) throw devicesRes.error;
      setDevices(devicesRes.data || []);
      
      if (settingsRes.error) throw settingsRes.error;
      const settingsObj = (settingsRes.data || []).reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
      setGeneralSettings(prev => ({...prev, ...settingsObj}));

    } catch (error) {
      toast.error('Gagal memuat data manajemen.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleDeviceApproval = async (device, approve) => {
    try {
        const { error } = await supabase
            .from('approved_devices')
            .update({ 
                is_active: approve,
                approved_by: user.id,
                approved_at: new Date().toISOString()
            })
            .eq('id', device.id);
        if (error) throw error;
        toast.success(`Device ${approve ? 'disetujui' : 'dicabut'}.`);
        fetchData();
    } catch (error) {
        toast.error('Gagal memproses status device.');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus item ini?')) return;
    
    try {
        if (type === 'location') {
            const { error: updateError } = await supabase.from('approved_wifi_networks').update({ location_id: null }).eq('location_id', id);
            if (updateError) throw updateError;
            const { error: deleteError } = await supabase.from('whitelist_locations').delete().eq('id', id);
            if (deleteError) throw deleteError;
        } else if (type === 'wifi') {
            const { error } = await supabase.from('approved_wifi_networks').delete().eq('id', id);
            if (error) throw error;
        } else {
            return;
        }
        toast.success('Item berhasil dihapus.');
        fetchData();
    } catch (error) {
        toast.error(`Gagal menghapus item: ${error.message}`);
    }
  };
  
  const TabButton = ({ id, label, icon: Icon }) => (
    <button onClick={() => setActiveTab(id)} className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
      <Icon className="h-4 w-4 mr-2" />{label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Sistem</h1>
        <p className="text-gray-600 mt-1">Kelola lokasi, WiFi, perangkat, dan pengaturan umum sistem.</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-wrap gap-4 mb-6 border-b pb-4">
          <TabButton id="locations" label="Lokasi" icon={MapPin} />
          <TabButton id="wifi" label="WiFi Networks" icon={Wifi} />
          <TabButton id="devices" label="Devices" icon={Radio} />
          <TabButton id="general" label="Pengaturan Umum" icon={Settings} />
        </div>
        {isLoading ? <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div> : <>
            {activeTab === 'locations' && <LocationsTab locations={locations} onEdit={(item) => handleOpenModal('location', item)} onDelete={handleDelete} onAdd={() => handleOpenModal('location')} />}
            {activeTab === 'wifi' && <WiFiTab networks={wifiNetworks} onEdit={(item) => handleOpenModal('wifi', item)} onDelete={handleDelete} onAdd={() => handleOpenModal('wifi')} />}
            {activeTab === 'devices' && <DevicesTab devices={devices} onApprove={handleDeviceApproval} />}
            {activeTab === 'general' && <GeneralSettingsTab initialSettings={generalSettings} />}
        </>}
      </div>
      {showModal && <ManagementModal type={modalType} item={editingItem} locations={locations} onClose={handleCloseModal} onSave={fetchData} />}
    </div>
  );
};

// Sub-components for each tab
const LocationsTab = ({ locations, onEdit, onDelete, onAdd }) => (
  <div>
    <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Whitelist Lokasi</h2><button onClick={onAdd} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"><Plus className="h-4 w-4 mr-2" />Tambah Lokasi</button></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {locations.map(loc => (<div key={loc.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4"><div className="flex items-start justify-between mb-3"><div><h3 className="font-medium text-gray-900">{loc.location_name}</h3><p className="text-sm text-gray-500">{loc.latitude}, {loc.longitude}</p></div><div className="flex space-x-1"><button onClick={() => onEdit(loc)} className="text-blue-600 hover:text-blue-700 p-1"><Edit className="h-4 w-4" /></button><button onClick={() => onDelete('location', loc.id)} className="text-red-600 hover:text-red-700 p-1"><Trash2 className="h-4 w-4" /></button></div></div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-600">Radius:</span><span className="font-medium">{loc.radius_meters}m</span></div><div className="flex justify-between"><span className="text-gray-600">Status:</span><span className={`font-medium ${loc.is_active ? 'text-green-600' : 'text-red-600'}`}>{loc.is_active ? 'Aktif' : 'Nonaktif'}</span></div></div></div>))}
    </div>
  </div>
);

const WiFiTab = ({ networks, onEdit, onDelete, onAdd }) => (
    <div>
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Whitelist WiFi</h2><button onClick={onAdd} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"><Plus className="h-4 w-4 mr-2" />Tambah WiFi</button></div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SSID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi Terhubung</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{networks.map(net => (<tr key={net.id}><td className="px-6 py-4"><span className="text-sm font-medium text-gray-900">{net.ssid}</span></td><td className="px-6 py-4 text-sm text-gray-500">{net.location?.location_name || 'N/A'}</td><td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${net.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{net.is_active ? 'Aktif' : 'Nonaktif'}</span></td><td className="px-6 py-4 text-sm font-medium"><div className="flex space-x-2"><button onClick={() => onEdit(net)} className="text-blue-600 hover:text-blue-700 p-1"><Edit className="h-4 w-4" /></button><button onClick={() => onDelete('wifi', net.id)} className="text-red-600 hover:text-red-700 p-1"><Trash2 className="h-4 w-4" /></button></div></td></tr>))}</tbody></table></div>
    </div>
);

const DevicesTab = ({ devices, onApprove }) => (
    <div>
        <h2 className="text-lg font-semibold mb-4">Manajemen Perangkat</h2>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{devices.map(dev => (<tr key={dev.id}><td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{dev.profile?.full_name}</p><p className="text-xs text-gray-500">{dev.profile?.employee_id}</p></td><td className="px-6 py-4"><p className="text-sm text-gray-900">{dev.device_name}</p><p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{dev.device_fingerprint}</p></td><td className="px-6 py-4"><span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${dev.is_active ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{dev.is_active ? 'Disetujui' : 'Pending/Nonaktif'}</span></td><td className="px-6 py-4 text-sm font-medium"><div className="flex space-x-2">{dev.is_active ? (<button onClick={() => onApprove(dev, false)} className="text-red-600 hover:text-red-700 flex items-center"><X className="h-4 w-4 mr-1"/>Cabut</button>) : (<button onClick={() => onApprove(dev, true)} className="text-green-600 hover:text-green-700 flex items-center"><Check className="h-4 w-4 mr-1"/>Setujui</button>)}</div></td></tr>))}</tbody></table></div>
    </div>
);

const GeneralSettingsTab = ({ initialSettings }) => {
    const [settings, setSettings] = useState(initialSettings);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const settingsToSave = Object.entries(settings).map(([key, value]) => ({ key, value }));
            const { error } = await supabase.from('company_settings').upsert(settingsToSave, { onConflict: 'key' });
            if (error) throw error;
            toast.success('Pengaturan berhasil disimpan.');
        } catch (error) {
            toast.error(`Gagal menyimpan pengaturan: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-semibold">Pengaturan Umum</h2>
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-900 flex items-center"><Clock className="h-5 w-5 mr-2 text-green-500"/>Jam Kerja</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium">Jam Mulai</label><input type="time" value={settings.work_start_time} onChange={e => setSettings({...settings, work_start_time: e.target.value})} className="mt-1 block w-full input-field" /></div>
                    <div><label className="block text-sm font-medium">Jam Selesai</label><input type="time" value={settings.work_end_time} onChange={e => setSettings({...settings, work_end_time: e.target.value})} className="mt-1 block w-full input-field" /></div>
                </div>
            </div>
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-900 flex items-center"><Shield className="h-5 w-5 mr-2 text-purple-500"/>Sistem</h3>
                <div><label className="block text-sm font-medium">Auto Delete Selfie (jam)</label><input type="number" value={settings.selfie_auto_delete_hours} onChange={e => setSettings({...settings, selfie_auto_delete_hours: e.target.value})} className="mt-1 block w-48 input-field" /><p className="text-xs text-gray-500 mt-1">Selfie absensi akan dihapus otomatis setelah waktu ini.</p></div>
            </div>
            <div className="flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"><Save className="h-4 w-4 mr-2"/>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
            </div>
        </div>
    );
};

// Modal Component
const ManagementModal = ({ type, item, locations, onClose, onSave }) => {
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [showMap, setShowMap] = useState(false);

    useEffect(() => {
        if (type === 'location') {
            setFormData({
                location_name: item?.location_name || '',
                latitude: item?.latitude || '',
                longitude: item?.longitude || '',
                radius_meters: item?.radius_meters || 100,
                is_active: item?.is_active ?? true,
            });
        } else if (type === 'wifi') {
            setFormData({
                ssid: item?.ssid || '',
                location_id: item?.location_id || null,
                description: item?.description || '',
                is_active: item?.is_active ?? true,
            });
        }
    }, [item, type]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const tableName = type === 'location' ? 'whitelist_locations' : 'approved_wifi_networks';
        try {
            const { error } = item
                ? await supabase.from(tableName).update(formData).eq('id', item.id)
                : await supabase.from(tableName).insert(formData);
            
            if (error) throw error;
            toast.success(`Data ${type} berhasil disimpan.`);
            onSave();
            onClose();
        } catch (error) {
            toast.error(`Gagal menyimpan data: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLocationSelect = (coords) => {
        setFormData(prev => ({ ...prev, latitude: coords[0], longitude: coords[1] }));
        setShowMap(false);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">{(item ? 'Edit' : 'Tambah') + ` ${type === 'location' ? 'Lokasi' : 'WiFi'}`}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button></div>
                    <form onSubmit={handleSave} className="space-y-4">
                        {type === 'location' && (
                            <>
                                <div><label className="block text-sm font-medium">Nama Lokasi</label><input type="text" value={formData.location_name} onChange={e => setFormData({...formData, location_name: e.target.value})} className="mt-1 block w-full input-field" required /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium">Latitude</label><input type="number" step="any" placeholder="-7.7956" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} className="mt-1 block w-full input-field" required /></div>
                                    <div><label className="block text-sm font-medium">Longitude</label><input type="number" step="any" placeholder="110.3695" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} className="mt-1 block w-full input-field" required /></div>
                                </div>
                                <button type="button" onClick={() => setShowMap(true)} className="w-full text-sm flex items-center justify-center bg-gray-100 p-2 rounded border hover:bg-gray-200">
                                    <MapPin className="h-4 w-4 mr-2"/> Pilih Lokasi dari Peta
                                </button>
                                <div><label className="block text-sm font-medium">Radius (meter)</label><input type="number" value={formData.radius_meters} onChange={e => setFormData({...formData, radius_meters: e.target.value})} className="mt-1 block w-full input-field" required /></div>
                            </>
                        )}
                        {type === 'wifi' && (
                             <>
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md"><p className="text-xs text-yellow-800"><b>Penting:</b> Nama WiFi (SSID) harus dimasukkan secara manual dan sama persis.</p></div>
                                <div><label className="block text-sm font-medium">Nama WiFi (SSID)</label><input type="text" value={formData.ssid} onChange={e => setFormData({...formData, ssid: e.target.value})} className="mt-1 block w-full input-field" required /></div>
                                <div><label className="block text-sm font-medium">Deskripsi</label><input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 block w-full input-field" /></div>
                                <div><label className="block text-sm font-medium">Hubungkan ke Lokasi (Opsional)</label><select value={formData.location_id || ''} onChange={e => setFormData({...formData, location_id: e.target.value || null})} className="mt-1 block w-full input-field"><option value="">Tidak terhubung</option>{locations.map(loc => <option key={loc.id} value={loc.id}>{loc.location_name}</option>)}</select></div>
                            </>
                        )}
                         <div><label className="flex items-center"><input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><span className="ml-2 text-sm">Aktif</span></label></div>
                        <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Batal</button><button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 flex items-center">{isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/>Menyimpan...</> : 'Simpan'}</button></div>
                    </form>
                </div>
            </div>
            <LocationPickerModal isOpen={showMap} onClose={() => setShowMap(false)} onLocationSelect={handleLocationSelect} initialPosition={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : undefined} />
        </>
    );
};

export default AdminManagementPage;
