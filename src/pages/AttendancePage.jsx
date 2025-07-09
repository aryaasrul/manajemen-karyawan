// src/pages/AttendancePage.jsx - Fix Camera Implementation
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAttendanceStore } from '../stores/attendanceStore'
import { useCompanyStore } from '../stores/companyStore'
import { toast } from 'react-hot-toast'
import { Camera, MapPin, Clock, CheckCircle, X, RotateCcw } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import dayjs from 'dayjs'

const AttendancePage = () => {
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [cameraStream, setCameraStream] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  
  const { user } = useAuthStore()
  const { todayAttendance, isLoading, checkIn, checkOut, getTodayAttendance } = useAttendanceStore()
  const { settings } = useCompanyStore()

  useEffect(() => {
    if (user?.id) {
      getTodayAttendance(user.id)
    }
  }, [user?.id, getTodayAttendance])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

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
        let errorMessage = 'Gagal mendapatkan lokasi'
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Akses lokasi ditolak. Harap aktifkan permission GPS.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Lokasi tidak tersedia'
            break
          case error.TIMEOUT:
            errorMessage = 'Request lokasi timeout'
            break
        }
        toast.error(errorMessage)
        setIsLocationLoading(false)
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 60000 
      }
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
      setIsProcessing(true)
      
      // Request camera permission and start stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false 
      })
      
      setCameraStream(stream)
      setShowCamera(true)
      
      // Wait a bit for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setIsProcessing(false)
      }, 100)
      
    } catch (error) {
      setIsProcessing(false)
      let errorMessage = 'Gagal membuka kamera'
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Akses kamera ditolak. Harap aktifkan permission kamera.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Kamera tidak ditemukan'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Kamera sedang digunakan aplikasi lain'
      }
      
      toast.error(errorMessage)
      console.error('Camera error:', error)
    }
  }

  // Capture selfie
  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Kamera belum siap')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create preview URL
        const imageUrl = URL.createObjectURL(blob)
        setCapturedImage({ blob, url: imageUrl })
        
        // Stop camera stream
        closeCamera()
        
        toast.success('Foto berhasil diambil!')
      } else {
        toast.error('Gagal mengambil foto')
      }
    }, 'image/jpeg', 0.8)
  }

  // Retake photo
  const retakePhoto = () => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    setCapturedImage(null)
    openCamera()
  }

  // Close camera
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }

  // Handle attendance submission
  const handleAttendanceSubmit = async () => {
    if (!location) {
      toast.error('Lokasi belum didapat')
      return
    }

    if (!isValidLocation()) {
      toast.error('Anda berada di luar radius kantor')
      return
    }

    if (!capturedImage) {
      toast.error('Foto selfie belum diambil')
      return
    }

    const isCheckIn = !todayAttendance?.check_in_time
    setIsProcessing(true)
    
    try {
      let result
      if (isCheckIn) {
        result = await checkIn(user.id, location, capturedImage.blob)
        if (!result.error) {
          toast.success('Check-in berhasil!')
        }
      } else {
        result = await checkOut(user.id, location, capturedImage.blob)
        if (!result.error) {
          toast.success('Check-out berhasil!')
        }
      }
      
      if (result.error) {
        toast.error('Gagal melakukan absensi: ' + result.error.message)
      } else {
        // Clear captured image after successful submission
        if (capturedImage?.url) {
          URL.revokeObjectURL(capturedImage.url)
        }
        setCapturedImage(null)
        setLocation(null)
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat absensi')
      console.error('Attendance error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Cancel attendance process
  const cancelAttendance = () => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    setCapturedImage(null)
    closeCamera()
    setLocation(null)
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
          <div className="space-y-6">
            {/* Step 1: Location */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center">
                  <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-sm flex items-center justify-center mr-2">1</span>
                  Dapatkan Lokasi
                </h3>
                <button
                  onClick={getCurrentLocation}
                  disabled={isLocationLoading || location}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLocationLoading ? <LoadingSpinner size="sm" /> : location ? 'Lokasi OK' : 'Dapatkan Lokasi'}
                </button>
              </div>
              
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
            </div>

            {/* Step 2: Camera */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center">
                  <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-sm flex items-center justify-center mr-2">2</span>
                  Ambil Selfie
                </h3>
                {!capturedImage && (
                  <button
                    onClick={openCamera}
                    disabled={!location || !isValidLocation() || isProcessing}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isProcessing ? <LoadingSpinner size="sm" /> : 'Buka Kamera'}
                  </button>
                )}
              </div>
              
              {capturedImage && (
                <div className="space-y-3">
                  <div className="relative">
                    <img 
                      src={capturedImage.url} 
                      alt="Captured selfie"
                      className="w-full max-w-sm mx-auto rounded-lg border"
                    />
                  </div>
                  <div className="flex space-x-3 justify-center">
                    <button
                      onClick={retakePhoto}
                      className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Ambil Ulang
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Submit */}
            {capturedImage && location && isValidLocation() && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium flex items-center mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-sm flex items-center justify-center mr-2">3</span>
                  Konfirmasi Absensi
                </h3>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleAttendanceSubmit}
                    disabled={isProcessing}
                    className="flex-1 bg-success-600 text-white py-3 px-4 rounded-md hover:bg-success-700 disabled:opacity-50 font-medium"
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Memproses...</span>
                      </div>
                    ) : (
                      `Konfirmasi ${canCheckIn ? 'Check-in' : 'Check-out'}`
                    )}
                  </button>
                  
                  <button
                    onClick={cancelAttendance}
                    disabled={isProcessing}
                    className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50 font-medium"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
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
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ambil Selfie</h3>
                <button
                  onClick={closeCamera}
                  disabled={isProcessing}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full max-h-80 object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                
                {/* Overlay circle guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-4 border-white border-dashed rounded-full opacity-50"></div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 mb-4">Posisikan wajah Anda di dalam lingkaran</p>
                <button
                  onClick={captureSelfie}
                  disabled={isProcessing}
                  className="bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {isProcessing ? <LoadingSpinner size="sm" /> : 'Ambil Foto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default AttendancePage