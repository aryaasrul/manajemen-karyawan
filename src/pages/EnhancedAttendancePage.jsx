import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Wifi, 
  Smartphone, 
  Clock, 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  Loader
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const EnhancedAttendancePage = () => {
  // States for validation
  const [validationState, setValidationState] = useState({
    location: null,
    wifi: null,
    device: null,
    score: 0,
    requiresApproval: true
  });

  // States for attendance
  const [currentStep, setCurrentStep] = useState(1);
  const [attendanceType, setAttendanceType] = useState('check_in'); // or 'check_out'
  const [todayAttendance] = useState(null); // Mock - would come from API

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Form states
  const [isProcessing, setIsProcessing] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [manualWifiSSID, setManualWifiSSID] = useState('');

  // Mock validation data
  const [mockValidation] = useState({
    location: {
      valid: true,
      name: 'Kantor Pusat',
      distance: 50
    },
    wifi: {
      valid: false,
      ssid: 'UnknownNetwork'
    },
    device: {
      valid: false,
      fingerprint: 'abc123def456',
      needsRegistration: true
    },
    workHours: {
      valid: true,
      currentTime: '09:15'
    }
  });

  useEffect(() => {
    // Simulate device fingerprinting
    generateDeviceFingerprint();
    
    // Check GPS location
    getCurrentLocation();
    
    // Detect network
    detectNetwork();
  }, []);

  const generateDeviceFingerprint = async () => {
    // Mock device fingerprinting
    setTimeout(() => {
      const fingerprint = 'dev_' + Math.random().toString(36).substr(2, 9);
      setValidationState(prev => ({
        ...prev,
        device: {
          valid: false,
          fingerprint,
          needsRegistration: true
        }
      }));
    }, 1000);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          // Mock location validation
          setValidationState(prev => ({
            ...prev,
            location: {
              valid: true,
              coordinates: location,
              name: 'Kantor Pusat',
              distance: 45
            }
          }));
          
          toast.success('Lokasi berhasil didapat');
        },
        (error) => {
          toast.error('Gagal mendapatkan lokasi GPS');
          setValidationState(prev => ({
            ...prev,
            location: {
              valid: false,
              error: error.message
            }
          }));
        }
      );
    } else {
      toast.error('GPS tidak didukung browser');
    }
  };

  const detectNetwork = () => {
    // Mock network detection
    setTimeout(() => {
      setValidationState(prev => ({
        ...prev,
        wifi: {
          valid: false,
          ssid: 'DetectedNetwork',
          approved: false
        }
      }));
    }, 500);
  };

  const runValidation = () => {
    setIsProcessing(true);
    
    // Mock validation calculation
    setTimeout(() => {
      const location = validationState.location?.valid ? 25 : 0;
      const wifi = validationState.wifi?.valid ? 25 : 0;
      const device = validationState.device?.valid ? 20 : 0;
      const workHours = mockValidation.workHours.valid ? 10 : 0;
      const selfie = capturedImage ? 10 : 0;
      
      const totalScore = location + wifi + device + workHours + selfie;
      
      setValidationState(prev => ({
        ...prev,
        score: totalScore,
        requiresApproval: totalScore < 80
      }));
      
      setCurrentStep(2);
      setIsProcessing(false);
      
      if (totalScore >= 80) {
        toast.success('Validasi berhasil! Akan otomatis disetujui.');
      } else {
        toast.warning('Skor validasi rendah. Akan memerlukan approval admin.');
      }
    }, 2000);
  };

  // Camera functions
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      
      setCameraStream(stream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast.error('Gagal mengakses kamera');
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Kamera belum siap');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage({ blob, url: imageUrl });
        closeCamera();
        toast.success('Foto berhasil diambil!');
      }
    }, 'image/jpeg', 0.8);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const retakePhoto = () => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }
    setCapturedImage(null);
    openCamera();
  };

  const handleSubmitAttendance = async () => {
    if (!capturedImage) {
      toast.error('Selfie diperlukan untuk absensi');
      return;
    }

    setIsProcessing(true);
    
    // Mock submission
    setTimeout(() => {
      setIsProcessing(false);
      
      if (validationState.requiresApproval) {
        toast.success('Absensi berhasil disubmit! Menunggu approval admin.');
      } else {
        toast.success('Absensi berhasil dan otomatis disetujui!');
      }
      
      // Reset form
      setCapturedImage(null);
      setCurrentStep(1);
    }, 2000);
  };

  const getValidationSummary = () => {
    return {
      score: validationState.score,
      scoreColor: validationState.score >= 80 ? 'green' : validationState.score >= 60 ? 'yellow' : 'red',
      requiresApproval: validationState.requiresApproval,
      checks: {
        location: {
          valid: validationState.location?.valid || false,
          message: validationState.location?.valid 
            ? `Lokasi valid: ${validationState.location.name}` 
            : 'Lokasi tidak valid atau di luar area yang diizinkan'
        },
        wifi: {
          valid: validationState.wifi?.valid || false,
          message: validationState.wifi?.valid 
            ? `WiFi disetujui: ${validationState.wifi.ssid}` 
            : 'WiFi tidak disetujui atau tidak terdeteksi'
        },
        device: {
          valid: validationState.device?.valid || false,
          message: validationState.device?.valid 
            ? 'Device terdaftar' 
            : 'Device belum terdaftar atau menunggu approval'
        },
        workHours: {
          valid: mockValidation.workHours.valid,
          message: mockValidation.workHours.valid 
            ? 'Dalam jam kerja' 
            : `Di luar jam kerja (${mockValidation.workHours.currentTime})`
        },
        selfie: {
          valid: !!capturedImage,
          message: capturedImage ? 'Selfie tersedia' : 'Selfie diperlukan'
        }
      }
    };
  };

  const validationSummary = getValidationSummary();
  const canProceed = validationSummary.score >= 50;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Enhanced Attendance System
        </h1>
        <p className="text-gray-600 mt-1">
          Sistem absensi dengan validasi multi-layer untuk keamanan maksimal
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Step 1: Validation */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center">
                <span className={`w-8 h-8 rounded-full text-white text-sm flex items-center justify-center mr-3 ${
                  currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-300'
                }`}>1</span>
                Validasi Sistem
              </h3>
              {validationSummary.score > 0 && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  validationSummary.scoreColor === 'green' ? 'bg-green-100 text-green-800' :
                  validationSummary.scoreColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Skor: {validationSummary.score}%
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Location Status */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <MapPin className={`h-5 w-5 mr-3 ${validationState.location ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="text-sm">
                    Lokasi: {validationState.location ? 'Terdeteksi' : 'Belum terdeteksi'}
                  </span>
                </div>
                <button
                  onClick={getCurrentLocation}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Refresh
                </button>
              </div>

              {/* WiFi Status */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Wifi className={`h-5 w-5 mr-3 ${validationState.wifi?.ssid ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-sm">
                      WiFi: {validationState.wifi?.ssid || 'Tidak terdeteksi'}
                    </span>
                  </div>
                </div>
                
                <input
                  type="text"
                  placeholder="Masukkan nama WiFi (SSID) manual"
                  value={manualWifiSSID}
                  onChange={(e) => setManualWifiSSID(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-2"
                />
              </div>

              {/* Device Status */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <Smartphone className={`h-5 w-5 mr-3 ${validationState.device?.valid ? 'text-green-600' : 'text-yellow-600'}`} />
                  <span className="text-sm">
                    Device: {validationState.device?.valid ? 'Terdaftar' : 'Belum terdaftar'}
                  </span>
                </div>
              </div>

              <button
                onClick={runValidation}
                disabled={isProcessing || !validationState.location}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Memvalidasi...
                  </div>
                ) : (
                  'Jalankan Validasi'
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Selfie */}
          {currentStep >= 2 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-lg flex items-center mb-4">
                <span className={`w-8 h-8 rounded-full text-white text-sm flex items-center justify-center mr-3 ${
                  currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'
                }`}>2</span>
                Ambil Foto Selfie
              </h3>

              {!capturedImage ? (
                <div className="text-center">
                  {!showCamera ? (
                    <button
                      onClick={openCamera}
                      disabled={!canProceed}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      <Camera className="h-5 w-5 inline mr-2" />
                      Buka Kamera
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-80 h-60 object-cover rounded-lg border"
                        />
                      </div>
                      <div className="flex space-x-3 justify-center">
                        <button
                          onClick={captureSelfie}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                        >
                          Ambil Foto
                        </button>
                        <button
                          onClick={closeCamera}
                          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <img 
                    src={capturedImage.url} 
                    alt="Captured selfie"
                    className="w-80 h-60 object-cover rounded-lg border mx-auto"
                  />
                  <div className="flex space-x-3 justify-center">
                    <button
                      onClick={retakePhoto}
                      className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Ambil Ulang
                    </button>
                    <button
                      onClick={handleSubmitAttendance}
                      disabled={isProcessing}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      {isProcessing ? (
                        <div className="flex items-center">
                          <Loader className="h-4 w-4 animate-spin mr-2" />
                          Memproses...
                        </div>
                      ) : (
                        `Konfirmasi ${attendanceType === 'check_in' ? 'Check In' : 'Check Out'}`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Validation Details */}
        <div className="space-y-6">
          {/* Validation Summary */}
          {validationSummary.score > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Status Validasi</h3>
                <button
                  onClick={() => setShowValidationDetails(!showValidationDetails)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {showValidationDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Score Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Skor Validasi</span>
                  <span className={`font-bold ${
                    validationSummary.scoreColor === 'green' ? 'text-green-600' :
                    validationSummary.scoreColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {validationSummary.score}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      validationSummary.scoreColor === 'green' ? 'bg-green-500' :
                      validationSummary.scoreColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${validationSummary.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Approval Status */}
              <div className={`p-3 rounded-lg text-center text-sm font-medium ${
                validationSummary.requiresApproval
                  ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  : 'bg-green-50 text-green-800 border border-green-200'
              }`}>
                {validationSummary.requiresApproval 
                  ? '⏳ Akan memerlukan approval admin'
                  : '✅ Akan otomatis disetujui'
                }
              </div>

              {/* Detailed Checks */}
              {showValidationDetails && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Detail Validasi:</h4>
                  
                  {Object.entries(validationSummary.checks).map(([key, check]) => (
                    <div key={key} className={`flex items-start p-2 rounded text-xs ${
                      check.valid ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <div className="flex-shrink-0 mt-0.5 mr-2">
                        {key === 'location' && <MapPin className={`h-3 w-3 ${check.valid ? 'text-green-600' : 'text-red-600'}`} />}
                        {key === 'wifi' && <Wifi className={`h-3 w-3 ${check.valid ? 'text-green-600' : 'text-red-600'}`} />}
                        {key === 'device' && <Smartphone className={`h-3 w-3 ${check.valid ? 'text-green-600' : 'text-red-600'}`} />}
                        {key === 'workHours' && <Clock className={`h-3 w-3 ${check.valid ? 'text-green-600' : 'text-red-600'}`} />}
                        {key === 'selfie' && <Camera className={`h-3 w-3 ${check.valid ? 'text-green-600' : 'text-red-600'}`} />}
                      </div>
                      <div>
                        <p className={`font-medium ${check.valid ? 'text-green-800' : 'text-red-800'}`}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </p>
                        <p className={`${check.valid ? 'text-green-700' : 'text-red-700'}`}>
                          {check.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4">Informasi</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Waktu:</span>
                <span className="font-medium">{new Date().toLocaleTimeString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tanggal:</span>
                <span className="font-medium">{new Date().toLocaleDateString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tipe:</span>
                <span className="font-medium">
                  {attendanceType === 'check_in' ? 'Check In' : 'Check Out'}
                </span>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">💡 Tips Validasi</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Pastikan GPS aktif dan izin lokasi diberikan</li>
              <li>• Koneksi ke WiFi kantor meningkatkan skor validasi</li>
              <li>• Device terdaftar akan otomatis disetujui</li>
              <li>• Ambil selfie dengan pencahayaan yang baik</li>
              <li>• Skor &gt;80% akan otomatis disetujui</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Hidden Elements */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <Loader className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-900">Memproses...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAttendancePage;