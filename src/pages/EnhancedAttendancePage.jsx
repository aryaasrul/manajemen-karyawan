import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCamera } from '../hooks/useCamera';
import { MapPin, Wifi, Smartphone, Clock, Camera, CheckCircle, XCircle, Loader2, RotateCcw, HelpCircle } from 'lucide-react';
import CameraCapture from '../components/common/CameraCapture';
import dayjs from 'dayjs';

// Komponen untuk menampilkan status validasi
const ValidationItem = ({ icon: Icon, label, status, message, onRetry, isLoading, children }) => {
  const statusConfig = {
    pending: { color: 'text-gray-400', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
    success: { color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> },
    error: { color: 'text-red-600', icon: <XCircle className="h-4 w-4" /> },
  };
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className={`p-3 border rounded-lg flex flex-col space-y-2 ${status === 'success' ? 'bg-green-50 border-green-200' : status === 'error' ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
      <div className="flex items-start space-x-3">
        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <p className={`font-medium ${config.color}`}>{label}</p>
            <div className={`flex items-center space-x-2 ${config.color}`}>
              {config.icon}
              <span className="text-xs font-semibold uppercase">{status}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{message}</p>
        </div>
        {status === 'error' && onRetry && (
          <button onClick={onRetry} disabled={isLoading} className="text-blue-600 text-xs hover:underline disabled:opacity-50">
            {isLoading ? 'Mencoba...' : 'Coba Lagi'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
};

const EnhancedAttendancePage = () => {
  const { user } = useAuthStore();
  const { settings, getSettings } = useCompanyStore();
  const { location, getCurrentLocation, isLoading: isLocationLoading, error: locationError } = useGeolocation();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationStatus, setValidationStatus] = useState({
    location: { status: 'pending', message: 'Memulai pengecekan lokasi GPS...' },
    wifi: { status: 'pending', message: 'Menunggu input SSID WiFi...' },
    device: { status: 'success', message: 'Perangkat terverifikasi (diasumsikan valid).' }, // Diasumsikan sukses untuk sementara
  });
  const [manualSsid, setManualSsid] = useState('');
  const [validationScore, setValidationScore] = useState(0);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [attendanceType, setAttendanceType] = useState(null);
  const [isAttendanceComplete, setIsAttendanceComplete] = useState(false);

  // 1. Inisialisasi data utama (tipe absensi & pengaturan)
  useEffect(() => {
    const init = async () => {
        setIsLoading(true);
        if (user?.id) {
            await getSettings();
            const { data, error } = await supabase.from('attendance').select('check_in_time, check_out_time').eq('user_id', user.id).eq('date', dayjs().format('YYYY-MM-DD')).maybeSingle();
            
            if (error) {
              console.error("Error fetching attendance:", error);
              toast.error("Gagal memuat status absensi.");
            }

            if (data?.check_in_time && data?.check_out_time) {
                setIsAttendanceComplete(true);
            } else if (data?.check_in_time) {
                setAttendanceType('check_out');
            } else {
                setAttendanceType('check_in');
            }
        }
        setIsLoading(false);
    };
    init();
  }, [user, getSettings]);

  // 2. Memulai validasi lokasi secara otomatis
  useEffect(() => {
    if (step === 1 && !isAttendanceComplete) {
      getCurrentLocation();
    }
  }, [step, isAttendanceComplete, getCurrentLocation]);

  // 3. Update status UI berdasarkan hasil pengambilan lokasi
  useEffect(() => {
    if (isLocationLoading) {
      setValidationStatus(prev => ({ ...prev, location: { status: 'pending', message: 'Sedang mengambil koordinat GPS...' }}));
    } else if (locationError) {
      setValidationStatus(prev => ({ ...prev, location: { status: 'error', message: locationError }}));
    } else if (location) {
      setValidationStatus(prev => ({ ...prev, location: { status: 'success', message: `Lokasi berhasil didapatkan.` }}));
    }
  }, [isLocationLoading, locationError, location]);


  const handleValidation = useCallback(async () => {
    if (!user || Object.keys(settings).length === 0 || !location) {
        toast.error("Lokasi belum siap. Pastikan GPS aktif.");
        return;
    }
    
    setIsProcessing(true);
    let score = 20; // Skor awal dari validasi device (placeholder)
    const approvalThreshold = parseInt(settings.auto_approve_threshold || '80', 10);

    // 1. Validasi Lokasi (menggunakan data yang sudah ada)
    try {
      const { data: validationResult, error } = await supabase.rpc('is_location_whitelisted', {
        p_lat: parseFloat(location.latitude),
        p_lng: parseFloat(location.longitude)
      });
      if (error) throw error;
      
      const isValid = validationResult?.[0]?.is_valid;
      if (isValid) {
        score += 25;
        setValidationStatus(prev => ({ ...prev, location: { status: 'success', message: `Terdeteksi di ${validationResult[0].location_name}` }}));
      } else {
        setValidationStatus(prev => ({ ...prev, location: { status: 'error', message: 'Anda berada di luar radius lokasi kantor yang diizinkan.' }}));
      }
    } catch (error) {
      setValidationStatus(prev => ({ ...prev, location: { status: 'error', message: "Gagal memvalidasi lokasi dengan server." }}));
    }

    // 2. Validasi WiFi secara manual
    if (manualSsid.trim() !== '') {
        const { data: wifiResult, error: wifiError } = await supabase
            .from('approved_wifi_networks')
            .select('ssid')
            .eq('ssid', manualSsid.trim())
            .eq('is_active', true)
            .maybeSingle();

        if (wifiError) {
            setValidationStatus(prev => ({ ...prev, wifi: { status: 'error', message: 'Gagal memvalidasi WiFi.' }}));
        } else if (wifiResult) {
            score += 25;
            setValidationStatus(prev => ({ ...prev, wifi: { status: 'success', message: `Terhubung ke WiFi yang disetujui: ${wifiResult.ssid}` }}));
        } else {
            setValidationStatus(prev => ({ ...prev, wifi: { status: 'error', message: 'Nama WiFi (SSID) tidak terdaftar atau tidak aktif.' }}));
        }
    } else {
        setValidationStatus(prev => ({ ...prev, wifi: { status: 'error', message: 'Nama WiFi (SSID) wajib diisi.' }}));
    }
    
    // 3. Validasi Jam Kerja
    const now = dayjs();
    const startTime = dayjs(settings.work_start_time, 'HH:mm');
    const endTime = dayjs(settings.work_end_time, 'HH:mm');
    if (now.isAfter(startTime) && now.isBefore(endTime)) {
      score += 10;
    }

    setValidationScore(score);
    setRequiresApproval(score < approvalThreshold);
    setIsProcessing(false);
    setStep(2);
  }, [user, settings, location, manualSsid]);

  const handleCapture = (blob) => {
    setCapturedImage(blob);
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    if (!capturedImage || !location || !user) {
        toast.error("Data tidak lengkap untuk absensi.");
        return;
    }
    setIsSubmitting(true);
    
    try {
        const filePath = `${user.id}/${attendanceType}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('selfies').upload(filePath, capturedImage, {
            contentType: 'image/jpeg'
        });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('selfies').getPublicUrl(filePath);

        // PERBAIKAN: Format data lokasi untuk tipe 'point' PostgreSQL
        const locationString = `(${location.longitude},${location.latitude})`;

        const attendanceRecord = {
            [`${attendanceType}_time`]: new Date().toISOString(),
            [`${attendanceType}_location`]: locationString, // Menggunakan format yang benar
            [`${attendanceType}_selfie_url`]: publicUrl,
            approval_status: requiresApproval ? 'pending' : 'approved',
        };

        const { data: savedAttendance, error: saveError } = await supabase
            .from('attendance')
            .upsert({
                user_id: user.id,
                date: dayjs().format('YYYY-MM-DD'),
                ...attendanceRecord
            }, { onConflict: 'user_id,date' })
            .select()
            .single();

        if (saveError) throw saveError;
        
        if (requiresApproval) {
            await supabase.from('attendance_approval_queue').insert({
                attendance_id: savedAttendance.id,
                user_id: user.id,
                submission_type: attendanceType,
                auto_validation_score: validationScore,
                validation_flags: validationStatus,
                priority: validationScore < 50 ? 3 : 2,
            });
        }

        toast.success(`Absensi ${attendanceType === 'check_in' ? 'masuk' : 'pulang'} berhasil!`);
        setStep(3);

    } catch (error) {
        toast.error(`Gagal melakukan absensi: ${error.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  if (isAttendanceComplete) {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900">Absensi Hari Ini Selesai!</h1>
                <p className="text-gray-600 mt-2">
                    Anda sudah melakukan check-in dan check-out untuk hari ini. Terima kasih!
                </p>
                <Link to="/dashboard" className="mt-6 inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">Kembali ke Dashboard</Link>
            </div>
        </div>
    );
  }
  
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Absensi {attendanceType === 'check_in' ? 'Masuk' : 'Pulang'}</h1>
          <p className="text-gray-600 mt-1 text-center mb-6">Sistem akan melakukan validasi sebelum Anda mengambil foto.</p>
          
          <div className="space-y-4">
            <ValidationItem {...validationStatus.location} icon={MapPin} label="Lokasi" onRetry={getCurrentLocation} isLoading={isLocationLoading} />
            <ValidationItem {...validationStatus.wifi} icon={Wifi} label="Jaringan WiFi">
                <div className="mt-2">
                    <label htmlFor="ssid-input" className="text-xs font-medium text-gray-700">Masukkan Nama WiFi (SSID):</label>
                    <input
                        id="ssid-input"
                        type="text"
                        value={manualSsid}
                        onChange={(e) => setManualSsid(e.target.value)}
                        placeholder="Contoh: Kantor_WiFi (sesuai huruf besar/kecil)"
                        className="mt-1 block w-full input-field text-sm"
                    />
                </div>
            </ValidationItem>
            <ValidationItem {...validationStatus.device} icon={Smartphone} label="Perangkat" />
          </div>

          <button onClick={handleValidation} disabled={isLocationLoading || isProcessing} className="mt-6 w-full bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center">
            {isProcessing ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memvalidasi...</> : 'Lanjutkan ke Ambil Foto'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Hasil Validasi</h2>
          <div className="space-y-3">
            <ValidationItem {...validationStatus.location} icon={MapPin} label="Lokasi" />
            <ValidationItem {...validationStatus.wifi} icon={Wifi} label="Jaringan WiFi" />
            <ValidationItem {...validationStatus.device} icon={Smartphone} label="Perangkat" />
          </div>
          <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
            <p className="text-sm text-blue-800">Skor Validasi Anda</p>
            <p className="text-3xl font-bold text-blue-600">{validationScore}%</p>
            <p className="text-xs text-blue-700 mt-1">{requiresApproval ? 'Absensi ini akan memerlukan persetujuan admin.' : 'Absensi ini akan disetujui secara otomatis.'}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Langkah 2: Ambil Foto Selfie</h2>
            {capturedImage ? (
                <div className="space-y-4">
                    <img src={URL.createObjectURL(capturedImage)} alt="Selfie" className="rounded-lg mx-auto border max-w-xs" />
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setShowCamera(true)} className="flex items-center text-sm"><RotateCcw className="h-4 w-4 mr-1"/> Ambil Ulang</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin"/> : `Konfirmasi ${attendanceType === 'check_in' ? 'Check In' : 'Check Out'}`}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-gray-600 mb-4">Pastikan wajah Anda terlihat jelas.</p>
                    <button onClick={() => setShowCamera(true)} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"><Camera className="h-4 w-4 mr-2 inline"/>Buka Kamera</button>
                </>
            )}
        </div>
        <CameraCapture isOpen={showCamera} onClose={() => setShowCamera(false)} onCapture={handleCapture} />
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Absensi Berhasil!</h1>
            <p className="text-gray-600 mt-2">
                {requiresApproval ? "Absensi Anda telah dikirim dan sedang menunggu persetujuan dari admin." : "Absensi Anda telah berhasil divalidasi dan disetujui secara otomatis."}
            </p>
            <Link to="/dashboard" className="mt-6 inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">Kembali ke Dashboard</Link>
        </div>
    </div>
  );
};

export default EnhancedAttendancePage;
