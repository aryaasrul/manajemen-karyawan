import { useState, useEffect, useCallback } from 'react'

export const useCamera = () => {
  const [stream, setStream] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [permissions, setPermissions] = useState({
    camera: null,
    location: null
  })

  // Check permissions status
  const checkPermissions = useCallback(async () => {
    try {
      // Check camera permission
      const cameraPermission = await navigator.permissions.query({ name: 'camera' })
      
      // Check location permission  
      const locationPermission = await navigator.permissions.query({ name: 'geolocation' })
      
      setPermissions({
        camera: cameraPermission.state,
        location: locationPermission.state
      })
    } catch (error) {
      console.log('Permission API not supported:', error)
    }
  }, [])

  // Request camera access
  const startCamera = useCallback(async (constraints = {}) => {
    setIsLoading(true)
    setError(null)
    
    const defaultConstraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    }
    
    const finalConstraints = { ...defaultConstraints, ...constraints }
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(finalConstraints)
      setStream(mediaStream)
      setIsLoading(false)
      return mediaStream
    } catch (err) {
      let errorMessage = 'Gagal mengakses kamera'
      
      switch (err.name) {
        case 'NotAllowedError':
          errorMessage = 'Akses kamera ditolak. Harap aktifkan permission kamera di browser.'
          break
        case 'NotFoundError':
          errorMessage = 'Kamera tidak ditemukan pada perangkat ini.'
          break
        case 'NotReadableError':
          errorMessage = 'Kamera sedang digunakan oleh aplikasi lain.'
          break
        case 'OverconstrainedError':
          errorMessage = 'Pengaturan kamera tidak didukung.'
          break
        case 'SecurityError':
          errorMessage = 'Akses kamera diblokir karena alasan keamanan.'
          break
        default:
          errorMessage = `Gagal mengakses kamera: ${err.message}`
      }
      
      setError(errorMessage)
      setIsLoading(false)
      throw new Error(errorMessage)
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop()
      })
      setStream(null)
    }
    setError(null)
  }, [stream])

  // Capture image from video element
  const captureImage = useCallback((videoElement, options = {}) => {
    if (!videoElement) {
      throw new Error('Video element tidak tersedia')
    }

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    const { width = videoElement.videoWidth, height = videoElement.videoHeight, quality = 0.8 } = options
    
    canvas.width = width
    canvas.height = height
    
    context.drawImage(videoElement, 0, 0, width, height)
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Gagal mengambil gambar'))
        }
      }, 'image/jpeg', quality)
    })
  }, [])

  // Switch camera (front/back)
  const switchCamera = useCallback(async (facingMode = 'user') => {
    if (stream) {
      stopCamera()
    }
    
    await startCamera({
      video: {
        facingMode,
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    })
  }, [startCamera, stopCamera, stream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Check permissions on mount
  useEffect(() => {
    checkPermissions()
  }, [checkPermissions])

  return {
    stream,
    isLoading,
    error,
    permissions,
    startCamera,
    stopCamera,
    captureImage,
    switchCamera,
    checkPermissions
  }
}