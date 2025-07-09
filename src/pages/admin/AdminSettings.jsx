// src/pages/admin/AdminSettings.jsx - New page untuk Company Settings
import { useState, useEffect } from 'react'
import { supabase, supabaseHelpers } from '../../lib/supabase'
import { useGeolocation } from '../../hooks/useGeolocation'
import { toast } from 'react-hot-toast'
import { 
  MapPin, 
  Settings, 
  Save, 
  RefreshCw, 
  Building, 
  Clock,
  Shield,
  Trash2
} from 'lucide-react'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    office_latitude: '',
    office_longitude: '',
    office_radius_meters: '100',
    work_start_time: '09:00',
    work_end_time: '13:00',
    selfie_auto_delete_hours: '24'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showMap, setShowMap] = useState(false)
  
  const { location, isLoading: isGettingLocation, getCurrentLocation, error: locationError } = useGeolocation()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabaseHelpers.getCompanySettingsObject()
      if (error) throw error
      
      setSettings(prevSettings => ({
        ...prevSettings,
        ...data
      }))
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Gagal memuat pengaturan')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleGetCurrentLocation = async () => {
    try {
      await getCurrentLocation()
      toast.success('Lokasi berhasil didapat!')
    } catch (error) {
      toast.error('Gagal mendapatkan lokasi: ' + error.message)
    }
  }

  const handleUseCurrentLocation = () => {
    if (location) {
      setSettings(prev => ({
        ...prev,
        office_latitude: location.latitude.toString(),
        office_longitude: location.longitude.toString()
      }))
      toast.success('Lokasi kantor diset ke lokasi saat ini')
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      // Validate coordinates
      const lat = parseFloat(settings.office_latitude)
      const lng = parseFloat(settings.office_longitude)
      
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Koordinat lokasi tidak valid')
      }
      
      if (lat < -90 || lat > 90) {
        throw new Error('Latitude harus antara -90 dan 90')
      }
      
      if (lng < -180 || lng > 180) {
        throw new Error('Longitude harus antara -180 dan 180')
      }

      // Save all settings
      const settingsToSave = [
        { key: 'office_latitude', value: settings.office_latitude, description: 'Latitude kantor untuk validasi GPS' },
        { key: 'office_longitude', value: settings.office_longitude, description: 'Longitude kantor untuk validasi GPS' },
        { key: 'office_radius_meters', value: settings.office_radius_meters, description: 'Radius maksimal dari kantor (meter)' },
        { key: 'work_start_time', value: settings.work_start_time, description: 'Jam mulai kerja' },
        { key: 'work_end_time', value: settings.work_end_time, description: 'Jam selesai kerja' },
        { key: 'selfie_auto_delete_hours', value: settings.selfie_auto_delete_hours, description: 'Auto delete selfie setelah X jam' }
      ]

      for (const setting of settingsToSave) {
        const { error } = await supabaseHelpers.updateCompanySetting(
          setting.key, 
          setting.value, 
          setting.description
        )
        if (error) throw error
      }

      toast.success('Pengaturan berhasil disimpan!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(error.message || 'Gagal menyimpan pengaturan')
    } finally {
      setIsSaving(false)
    }
  }

  const testOfficeLocation = () => {
    if (settings.office_latitude && settings.office_longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${settings.office_latitude},${settings.office_longitude}`
      window.open(googleMapsUrl, '_blank')
    } else {
      toast.error('Harap set koordinat kantor terlebih dahulu')
    }
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return Math.round(R * c) // Distance in meters
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
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Perusahaan</h1>
        <p className="text-gray-600 mt-1">Kelola lokasi kantor dan pengaturan sistem</p>
      </div>

      {/* Office Location Settings */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Building className="h-5 w-5 mr-2 text-blue-500" />
            Lokasi Kantor
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Current Location Detection */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Lokasi Saat Ini</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {location 
                    ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                    : 'Belum terdeteksi'
                  }
                </p>
                {location && settings.office_latitude && settings.office_longitude && (
                  <p className="text-xs text-blue-600 mt-1">
                    Jarak dari kantor: {calculateDistance(
                      location.latitude, 
                      location.longitude, 
                      parseFloat(settings.office_latitude), 
                      parseFloat(settings.office_longitude)
                    )} meter
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {isGettingLocation ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Deteksi
                </button>
                {location && (
                  <button
                    onClick={handleUseCurrentLocation}
                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    Gunakan
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Manual Coordinates Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude Kantor
              </label>
              <input
                type="number"
                step="any"
                value={settings.office_latitude}
                onChange={(e) => handleInputChange('office_latitude', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="-6.2088"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude Kantor
              </label>
              <input
                type="number"
                step="any"
                value={settings.office_longitude}
                onChange={(e) => handleInputChange('office_longitude', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="106.8456"
              />
            </div>
          </div>

          {/* Radius Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Radius Kantor (meter)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="10"
                max="1000"
                value={settings.office_radius_meters}
                onChange={(e) => handleInputChange('office_radius_meters', e.target.value)}
                className="block w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-600">
                Karyawan harus dalam radius ini untuk absensi
              </span>
            </div>
          </div>

          {/* Map Preview */}
          {settings.office_latitude && settings.office_longitude && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Pratinjau Lokasi</h4>
                <button
                  onClick={testOfficeLocation}
                  className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Buka di Maps
                </button>
              </div>
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <MapPin className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">
                  {settings.office_latitude}, {settings.office_longitude}
                </p>
                <p className="text-xs text-gray-600">
                  Radius: {settings.office_radius_meters} meter
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Work Hours Settings */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-green-500" />
            Jam Kerja
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jam Mulai Kerja
              </label>
              <input
                type="time"
                value={settings.work_start_time}
                onChange={(e) => handleInputChange('work_start_time', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jam Selesai Kerja
              </label>
              <input
                type="time"
                value={settings.work_end_time}
                onChange={(e) => handleInputChange('work_end_time', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-purple-500" />
            Pengaturan Sistem
          </h2>
        </div>
        
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auto Delete Selfie (jam)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="1"
                max="168"
                value={settings.selfie_auto_delete_hours}
                onChange={(e) => handleInputChange('selfie_auto_delete_hours', e.target.value)}
                className="block w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-600">
                Selfie akan dihapus otomatis setelah waktu ini
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Simpan Pengaturan</h3>
            <p className="text-sm text-gray-600">
              Pastikan semua pengaturan sudah benar sebelum menyimpan
            </p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Simpan Pengaturan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings