import { useState, useCallback } from 'react'

export const useGeolocation = () => {
  const [location, setLocation] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const getCurrentLocation = useCallback((options = {}) => {
    return new Promise((resolve, reject) => {
      setIsLoading(true)
      setError(null)
      
      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
      
      const finalOptions = { ...defaultOptions, ...options }
      
      if (!navigator.geolocation) {
        const errorMsg = 'Geolocation tidak didukung oleh browser ini'
        setError(errorMsg)
        setIsLoading(false)
        reject(new Error(errorMsg))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          }
          
          setLocation(locationData)
          setIsLoading(false)
          resolve(locationData)
        },
        (err) => {
          let errorMessage = 'Gagal mendapatkan lokasi'
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Akses lokasi ditolak. Harap aktifkan permission GPS di browser.'
              break
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Informasi lokasi tidak tersedia.'
              break
            case err.TIMEOUT:
              errorMessage = 'Request lokasi timeout. Coba lagi.'
              break
            default:
              errorMessage = `Gagal mendapatkan lokasi: ${err.message}`
          }
          
          setError(errorMessage)
          setIsLoading(false)
          reject(new Error(errorMessage))
        },
        finalOptions
      )
    })
  }, [])

  const clearLocation = useCallback(() => {
    setLocation(null)
    setError(null)
  }, [])

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
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
  }, [])

  const isWithinRadius = useCallback((targetLat, targetLon, radiusMeters) => {
    if (!location) return false
    
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      targetLat,
      targetLon
    )
    
    return distance <= radiusMeters
  }, [location, calculateDistance])

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
    clearLocation,
    calculateDistance,
    isWithinRadius
  }
}