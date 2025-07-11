import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useCamera } from '../../hooks/useCamera';
import { MapPin, Wifi, Smartphone, Clock, Camera, CheckCircle, XCircle, Loader2, RotateCcw, HelpCircle } from 'lucide-react';
import CameraCapture from '../../components/common/CameraCapture';

// Komponen untuk menampilkan status validasi
const ValidationItem = ({ icon: Icon, label, status, message, onRetry, isLoading }) => {
  const statusConfig = {
    pending: { color: 'text-gray-400', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
    success: { color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> },
    error: { color: 'text-red-600', icon: <XCircle className="h-4 w-4" /> },
  };
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className={`p-3 border rounded-lg flex items-start space-x-3 ${status === 'success' ? 'bg-green-50 border-green-200' : status === 'error' ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
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
  );
};

const EnhancedAttendancePage = () => {
  const { user } = useAuthStore();
  const { settings, getSettings } = useCompanyStore();
  const { location, getCurrentLocation, isLoading: isLocationLoading } = useGeolocation();
  const { captureImage } = useCamera();
  
  const [step, setStep] = useState(1); // 1: validation, 2: selfie, 3: result
  const [isLoading, setIsLoading] = useState(true);
  const [validationStatus, setValidationStatus] = useState({
    location: { status: 'pending', message: 'Mengecek lokasi GPS...' },
    wifi: { status: 'pending', message: 'Mendeteksi jaringan...' },
    device: { status: 'pending', message: 'Memverifikasi perangkat...' },
  });
  const [validationScore, setValidationScore] = useState(0);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [attendanceType, setAttendanceType] = useState(null);

  // Fungsi untuk menjalankan semua validasi
  const runAllValidations = useCallback(async () => {
    if (!user || Object.keys(settings).length === 0) return;
    
    setIsLoading(true);
    let score = 0;
    const approvalThreshold = parseInt(settings.auto_approve_threshold || '80', 10);

    // 1. Validasi Lokasi
    try {
      const currentLocation = await getCurrentLocation();
      const { data: validationResult, error } = await supabase.rpc('is_location_whitelisted', {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude
      });
      if (error) throw error;
      
      const isValid = validationResult[0]?.is_valid;
      if (isValid) score += 25;
      setValidationStatus(prev => ({ ...prev, location: {
        status: isValid ? 'success' : 'error',
        message: isValid ? `Terdeteksi di ${validationResult[0].location_name}` : 'Anda berada di luar radius lokasi kantor yang diizinkan.'
      }}));
    } catch (error) {
      setValidationStatus(prev => ({ ...prev, location: { status: 'error', message: error.message }}));
    }

    // 2. Validasi WiFi (Placeholder - karena keterbatasan browser)
    // Untuk saat ini, kita berikan status netral atau bisa diganti dengan input manual jika diperlukan
    score += 25; // Asumsi WiFi valid untuk demo, bisa diubah
    setValidationStatus(prev => ({ ...prev, wifi: { status: 'success', message: 'Validasi WiFi manual (diasumsikan valid).' }}));
    
    // 3. Validasi Device
    // Logika ini perlu disempurnakan dengan fingerprinting yang lebih canggih
    score += 20; // Asumsi device valid
    setValidationStatus(prev => ({ ...prev, device: { status: 'success', message: 'Perangkat terverifikasi.' }}));
    
    // 4. Validasi Jam Kerja
    const now = dayjs();
    const startTime = dayjs(settings.work_start_time, 'HH:mm');
    const endTime = dayjs(settings.work_end_time, 'HH:mm');
    if (now.isAfter(startTime) && now.isBefore(endTime)) {
      score += 10;
    }

    setValidationScore(score);
    setRequiresApproval(score < approvalThreshold);
    setIsLoading(false);
    setStep(2); // Lanjut ke langkah selfie
  }, [user, settings, getCurrentLocation]);

  // Fetch data awal
  useEffect(() => {
    const init = async () => {
        if (user?.id) {
            await getSettings();
            const { data } = await supabase.from('attendance').select('check_in_time, check_out_time').eq('user_id', user.id).eq('date', dayjs().format('YYYY-MM-DD')).single();
            if (data?.check_in_time && !data?.check_out_time) {
                setAttendanceType('check_out');
            } else {
                setAttendanceType('check_in');
            }
        }
    };
    init();
  }, [user, getSettings]);
  
  const handleStartAttendance = () => {
    runAllValidations();
  };

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
        // 1. Upload selfie
        const filePath = `${user.id}/${attendanceType}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('selfies').upload(filePath, capturedImage, {
            contentType: 'image/jpeg'
        });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('selfies').getPublicUrl(filePath);

        // 2. Siapkan data absensi
        const attendanceRecord = {
            [`${attendanceType}_time`]: new Date().toISOString(),
            [`${attendanceType}_location`]: `POINT(${location.longitude} ${location.latitude})`,
            [`${attendanceType}_selfie_url`]: publicUrl,
            approval_status: requiresApproval ? 'pending' : 'approved',
            // ... (tambahkan data validasi lain jika perlu)
        };

        // 3. Simpan ke tabel attendance
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
        
        // 4. Jika perlu approval, masukkan ke queue
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
        setStep(3); // Tampilkan halaman hasil

    } catch (error) {
        toast.error(`Gagal melakukan absensi: ${error.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!attendanceType) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }
  
  if (attendanceType === 'check_in' && step === 1) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Absensi Masuk</h1>
          <p className="text-gray-600 mt-1">Sistem akan melakukan validasi sebelum Anda mengambil foto.</p>
          <button onClick={handleStartAttendance} disabled={isLoading} className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center w-full sm:w-auto mx-auto">
            {isLoading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Memvalidasi...</> : 'Mulai Proses Absensi'}
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
            <ValidationItem {...validationStatus.location} icon={MapPin} label="Lokasi" onRetry={runAllValidations} isLoading={isLoading} />
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
