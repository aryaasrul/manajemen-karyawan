import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAttendanceStore } from '../stores/attendanceStore'
import { useCompanyStore } from '../stores/companyStore'
import { toast } from 'react-hot-toast'
import { Camera, MapPin, Clock, CheckCircle } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import dayjs from 'dayjs'

const AttendancePage = () => {
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [cameraStream, setCameraStream] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  
  const { user } = useAuthStore()
  const { todayAttendance, isLoading, checkIn, checkOut, getTodayAttendance } = useAttendanceStore()
  const { settings } = useCompanyStore()

  useEffect(() => {
    if (user?.id) {
      getTodayAttendance(user.id)
    }
  }, [user?.id, getTodayAttendance])

  // Get current location
  const getCurrentLocation = () => {
    setIsLocationLoading(true)
    
    if (!navigator.geolocation) {
      toast.error('Browser tidak mendukung GPS')
      setIsLocationLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
        setIsLocationLoading(false)
        toast.success('Lokasi berhasil didapat')
      },
      (error) => {
        toast.error('Gagal mendapatkan lokasi: ' + error.message)
        setIsLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Calculate distance from office
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

    return R * c // Distance in meters
  }

  // Check if location is valid
  const isValidLocation = () => {
    if (!location || !settings.office_latitude || !settings.office_longitude) return false
    
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      parseFloat(settings.office_latitude),
      parseFloat(settings.office_longitude)
    )
    
    return distance <= parseFloat(settings.office_radius_meters || 100)
  }

  // Open camera
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      })
      setCameraStream(stream)
      setShowCamera(true)
    } catch (error) {
      toast.error('Gagal membuka kamera: ' + error.message)
    }
  }

  // Capture selfie
  const captureSelfie = () => {
    const video = document.getElementById('camera-video')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    canvas.toBlob((blob) => {
      handleAttendance(blob)
    }, 'image/jpeg', 0.8)
  }

  // Close camera
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }

  // Handle check-in/check-out
  const handleAttendance = async (selfieBlob) => {
    if (!location) {
      toast.error('Lokasi belum didapat')
      return
    }

    if (!isValidLocation()) {
      toast.error('Anda berada di luar radius kantor')
      return
    }

    const isCheckIn = !todayAttendance?.check_in_time
    
    try {
      if (isCheckIn) {
        await checkIn(user.id, location, selfieBlob)
        toast.success('Check-in berhasil!')
      } else {
        await checkOut(user.id, location, selfieBlob)
        toast.success('Check-out berhasil!')
      }
      closeCamera()
    } catch (error) {
      toast.error('Gagal melakukan absensi')
    }
  }

  const canCheckIn = !todayAttendance?.check_in_time
  const canCheckOut = todayAttendance?.check_in_time && !todayAttendance?.check_out_time

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Absensi</h1>
        <p className="text-gray-600 mt-1">
          {dayjs().format('dddd, DD MMMM YYYY')}
        </p>
      </div>

      {/* Current Status */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Hari Ini</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <Clock className="h-6 w-6 text-primary-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Check-in</p>
              <p className="font-semibold">
                {todayAttendance?.check_in_time 
                  ? dayjs(todayAttendance.check_in_time).format('HH:mm')
                  : 'Belum check-in'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <Clock className="h-6 w-6 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Check-out</p>
              <p className="font-semibold">
                {todayAttendance?.check_out_time 
                  ? dayjs(todayAttendance.check_out_time).format('HH:mm')
                  : 'Belum check-out'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="h-6 w-6 text-success-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Menit</p>
              <p className="font-semibold">{todayAttendance?.total_minutes || 0} menit</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Action */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {canCheckIn ? 'Check-in' : canCheckOut ? 'Check-out' : 'Absensi Selesai'}
        </h2>

        {(canCheckIn || canCheckOut) && (
          <div className="space-y-4">
            {/* Location Step */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  location ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <MapPin size={16} />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-medium">1. Dapatkan Lokasi</p>
                <p className="text-sm text-gray-600">
                  {location 
                    ? `Lokasi: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                    : 'Klik tombol untuk mendapatkan lokasi'
                  }
                </p>
              </div>
              <button
                onClick={getCurrentLocation}
                disabled={isLocationLoading || location}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLocationLoading ? <LoadingSpinner size="sm" /> : location ? 'Lokasi OK' : 'Dapatkan Lokasi'}
              </button>
            </div>

            {/* Location Validation */}
            {location && (
              <div className={`p-3 rounded-md ${
                isValidLocation() 
                  ? 'bg-success-50 border border-success-200' 
                  : 'bg-danger-50 border border-danger-200'
              }`}>
                <p className={`text-sm font-medium ${
                  isValidLocation() ? 'text-success-800' : 'text-danger-800'
                }`}>
                  {isValidLocation() 
                    ? '✓ Anda berada dalam radius kantor' 
                    : '✗ Anda berada di luar radius kantor'
                  }
                </p>
              </div>
            )}

            {/* Camera Step */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  showCamera ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Camera size={16} />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-medium">2. Ambil Selfie</p>
                <p className="text-sm text-gray-600">Pastikan wajah Anda terlihat jelas</p>
              </div>
              <button
                onClick={openCamera}
                disabled={!location || !isValidLocation()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buka Kamera
              </button>
            </div>
          </div>
        )}

        {todayAttendance?.status === 'completed' && (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-16 w-16 text-success-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Absensi Hari Ini Selesai</h3>
            <p className="text-gray-600">Terima kasih atas kerja keras Anda!</p>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Ambil Selfie</h3>
            
            <div className="relative">
              <video
                id="camera-video"
                ref={(video) => {
                  if (video && cameraStream) {
                    video.srcObject = cameraStream
                    video.play()
                  }
                }}
                className="w-full rounded-lg"
                autoPlay
                playsInline
              />
            </div>
            
            <div className="flex space-x-4 mt-4">
              <button
                onClick={captureSelfie}
                disabled={isLoading}
                className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'Ambil Foto'}
              </button>
              <button
                onClick={closeCamera}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AttendancePage
