import { useEffect, useRef, useState } from 'react'
import { useCamera } from '../../hooks/useCamera'
import { Camera, RotateCcw, X } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'

const CameraCapture = ({ 
  onCapture, 
  onClose, 
  isOpen = false,
  title = "Ambil Foto",
  guidance = "Posisikan wajah Anda di dalam lingkaran"
}) => {
  const videoRef = useRef(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { 
    stream, 
    isLoading, 
    error, 
    startCamera, 
    stopCamera, 
    captureImage 
  } = useCamera()

  useEffect(() => {
    if (isOpen && !stream && !isLoading) {
      startCamera()
    }
    
    if (!isOpen) {
      stopCamera()
      setCapturedImage(null)
    }
  }, [isOpen, stream, isLoading, startCamera, stopCamera])

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const handleCapture = async () => {
    if (!videoRef.current) return
    
    try {
      setIsProcessing(true)
      const blob = await captureImage(videoRef.current)
      const imageUrl = URL.createObjectURL(blob)
      
      setCapturedImage({ blob, url: imageUrl })
      stopCamera()
    } catch (error) {
      console.error('Capture error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRetake = () => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    setCapturedImage(null)
    startCamera()
  }

  const handleConfirm = () => {
    if (capturedImage?.blob) {
      onCapture(capturedImage.blob)
      
      // Cleanup
      if (capturedImage.url) {
        URL.revokeObjectURL(capturedImage.url)
      }
      setCapturedImage(null)
    }
  }

  const handleClose = () => {
    stopCamera()
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    setCapturedImage(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">
                <Camera className="h-16 w-16 mx-auto mb-2" />
                <p className="font-medium">Gagal Mengakses Kamera</p>
              </div>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
              >
                Coba Lagi
              </button>
            </div>
          ) : capturedImage ? (
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={capturedImage.url} 
                  alt="Captured"
                  className="w-full max-h-80 object-cover rounded-lg"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Ambil Ulang
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  Gunakan Foto
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-80 bg-gray-900">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full max-h-80 object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    
                    {/* Overlay guide */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-4 border-white border-dashed rounded-full opacity-50"></div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">{guidance}</p>
                <button
                  onClick={handleCapture}
                  disabled={isLoading || isProcessing || !stream}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {isProcessing ? <LoadingSpinner size="sm" /> : 'Ambil Foto'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CameraCapture