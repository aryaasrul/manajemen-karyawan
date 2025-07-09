import { useState } from 'react'
import { supabaseHelpers } from '../../lib/supabase'
import { useGeolocation } from '../../hooks/useGeolocation'
import { toast } from 'react-hot-toast'
import { MapPin, Save, X, Building, RefreshCw } from 'lucide-react'
import LoadingSpinner from '../common/LoadingSpinner'

const QuickOfficeSetup = ({ isOpen, onClose, onSuccess }) => {
  const [officeData, setOfficeData] = useState({
    latitude: '',
    longitude: '',
    radius: '100'
  })
  const [isSaving, setIsSaving] = useState(false)
  
  const { location, isLoading: isGettingLocation, getCurrentLocation } = useGeolocation()

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
      setOfficeData(prev => ({
        ...prev,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString()
      }))
      toast.success('Lokasi kantor diset ke lokasi saat ini')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Validate coordinates
      const lat = parseFloat(officeData.latitude)
      const lng = parseFloat(officeData.longitude)
      
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Koordinat lokasi tidak valid')
      }

      // Save office location settings
      await supabaseHelpers.updateCompanySetting('office_latitude', officeData.latitude)
      await supabaseHelpers.updateCompanySetting('office_longitude', officeData.longitude)
      await supabaseHelpers.updateCompanySetting('office_radius_meters', officeData.radius)

      toast.success('Lokasi kantor berhasil disimpan!')
      onSuccess && onSuccess()
      onClose()
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan lokasi kantor')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building className="h-5 w-5 mr-2 text-blue-500" />
              Setup Lokasi Kantor
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Current Location */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Lokasi Saat Ini</p>
                  <p className="text-xs text-blue-700">
                    {location 
                      ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                      : 'Belum terdeteksi'
                    }
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleGetCurrentLocation}
                    disabled={isGettingLocation}
                    className="flex items-center px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isGettingLocation ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Deteksi
                  </button>
                  {location && (
                    <button
                      onClick={handleUseCurrentLocation}
                      className="flex items-center px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Gunakan
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Input */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={officeData.latitude}
                  onChange={(e) => setOfficeData(prev => ({ ...prev, latitude: e.target.value }))}
                  className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="-6.2088"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={officeData.longitude}
                  onChange={(e) => setOfficeData(prev => ({ ...prev, longitude: e.target.value }))}
                  className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="106.8456"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Radius (meter)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={officeData.radius}
                onChange={(e) => setOfficeData(prev => ({ ...prev, radius: e.target.value }))}
                className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Karyawan harus dalam radius ini untuk absensi
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving || !officeData.latitude || !officeData.longitude}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {isSaving ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Simpan
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickOfficeSetup
