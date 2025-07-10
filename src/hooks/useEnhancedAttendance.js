// ============================================
// FILE: src/hooks/useEnhancedAttendance.js
// React Hook for Enhanced Attendance System
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { AttendanceValidator } from '../lib/attendanceValidation';
import { useGeolocation } from './useGeolocation';
import { toast } from 'react-hot-toast';

export const useEnhancedAttendance = () => {
  const [validationState, setValidationState] = useState({
    isValidating: false,
    validationResults: null,
    error: null,
    lastValidation: null
  });

  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    error: null,
    lastSubmission: null
  });

  const [networkState, setNetworkState] = useState({
    isDetecting: false,
    networkInfo: null,
    wifiSSID: '',
    manualWifiMode: false
  });

  const [deviceState, setDeviceState] = useState({
    isGenerating: false,
    deviceFingerprint: null,
    isRegistered: false,
    needsRegistration: false
  });

  const { location, isLoading: isGettingLocation, getCurrentLocation } = useGeolocation();

  // Initialize device fingerprint on mount
  useEffect(() => {
    generateDeviceFingerprint();
  }, []);

  // Generate device fingerprint
  const generateDeviceFingerprint = useCallback(async () => {
    setDeviceState(prev => ({ ...prev, isGenerating: true }));
    
    try {
      const fingerprint = await AttendanceValidator.generateDeviceFingerprint();
      setDeviceState(prev => ({
        ...prev,
        deviceFingerprint: fingerprint,
        isGenerating: false
      }));
      return fingerprint;
    } catch (error) {
      console.error('Device fingerprint generation error:', error);
      setDeviceState(prev => ({
        ...prev,
        error: error.message,
        isGenerating: false
      }));
      return null;
    }
  }, []);

  // Detect network information
  const detectNetwork = useCallback(async () => {
    setNetworkState(prev => ({ ...prev, isDetecting: true }));
    
    try {
      const networkInfo = await AttendanceValidator.detectWiFiNetwork();
      setNetworkState(prev => ({
        ...prev,
        networkInfo,
        isDetecting: false,
        // Enable manual mode if WiFi SSID is not automatically detected
        manualWifiMode: !networkInfo.ssid && !networkInfo.error
      }));
      return networkInfo;
    } catch (error) {
      console.error('Network detection error:', error);
      setNetworkState(prev => ({
        ...prev,
        error: error.message,
        isDetecting: false,
        manualWifiMode: true
      }));
      return null;
    }
  }, []);

  // Check device registration status
  const checkDeviceRegistration = useCallback(async (userId) => {
    if (!deviceState.deviceFingerprint) {
      await generateDeviceFingerprint();
    }

    try {
      const result = await AttendanceValidator.checkDeviceRegistration(
        userId, 
        deviceState.deviceFingerprint
      );
      
      setDeviceState(prev => ({
        ...prev,
        isRegistered: result.isRegistered,
        needsRegistration: result.needsApproval
      }));

      return result;
    } catch (error) {
      console.error('Device registration check error:', error);
      return { isRegistered: false, error: error.message };
    }
  }, [deviceState.deviceFingerprint, generateDeviceFingerprint]);

  // Register device
  const registerDevice = useCallback(async (userId, deviceName = null) => {
    if (!deviceState.deviceFingerprint) {
      throw new Error('Device fingerprint belum tersedia');
    }

    try {
      const result = await AttendanceValidator.registerDevice(
        userId,
        deviceState.deviceFingerprint,
        {
          name: deviceName || `Device ${new Date().toLocaleDateString()}`,
          registeredAt: new Date().toISOString()
        }
      );

      if (result.success) {
        setDeviceState(prev => ({
          ...prev,
          needsRegistration: false
        }));
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }

      return result;
    } catch (error) {
      console.error('Device registration error:', error);
      toast.error('Gagal mendaftarkan device');
      return { success: false, error: error.message };
    }
  }, [deviceState.deviceFingerprint]);

  // Run comprehensive validation
  const runValidation = useCallback(async (userId, forceLocationRefresh = false) => {
    setValidationState(prev => ({ ...prev, isValidating: true, error: null }));
    
    try {
      // Get current location if needed
      let currentLocation = location;
      if (!currentLocation || forceLocationRefresh) {
        await getCurrentLocation();
        currentLocation = location;
      }

      // Detect network if not already done
      let currentNetwork = networkState.networkInfo;
      if (!currentNetwork) {
        currentNetwork = await detectNetwork();
      }

      // Use manual WiFi SSID if provided
      const wifiSSID = networkState.manualWifiMode ? networkState.wifiSSID : currentNetwork?.ssid;

      // Run comprehensive validation
      const validationResults = await AttendanceValidator.validateAttendance(
        userId,
        currentLocation,
        true, // Assume selfie will be provided
        wifiSSID
      );

      setValidationState({
        isValidating: false,
        validationResults,
        error: validationResults.errors.length > 0 ? validationResults.errors.join(', ') : null,
        lastValidation: new Date().toISOString()
      });

      return validationResults;
    } catch (error) {
      console.error('Validation error:', error);
      setValidationState(prev => ({
        ...prev,
        isValidating: false,
        error: error.message
      }));
      throw error;
    }
  }, [location, getCurrentLocation, networkState, detectNetwork]);

  // Submit attendance with validation
  const submitAttendance = useCallback(async (userId, attendanceType, selfieBlob) => {
    setSubmitState(prev => ({ ...prev, isSubmitting: true, error: null }));
    
    try {
      // Ensure we have current location
      let currentLocation = location;
      if (!currentLocation) {
        await getCurrentLocation();
        currentLocation = location;
      }

      if (!currentLocation) {
        throw new Error('Lokasi GPS tidak tersedia. Pastikan GPS aktif dan izin lokasi telah diberikan.');
      }

      // Ensure we have network info
      let currentNetwork = networkState.networkInfo;
      if (!currentNetwork) {
        currentNetwork = await detectNetwork();
      }

      // Use manual WiFi SSID if provided
      const wifiSSID = networkState.manualWifiMode ? networkState.wifiSSID : currentNetwork?.ssid;

      // Submit attendance
      const result = await AttendanceValidator.submitAttendance(
        userId,
        attendanceType,
        currentLocation,
        selfieBlob,
        wifiSSID
      );

      if (result.success) {
        setSubmitState({
          isSubmitting: false,
          error: null,
          lastSubmission: {
            ...result,
            timestamp: new Date().toISOString()
          }
        });

        // Show appropriate success message
        if (result.requiresApproval) {
          toast.success('Absensi berhasil disubmit! Menunggu approval admin.');
        } else {
          toast.success('Absensi berhasil dan otomatis disetujui!');
        }
      } else {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error('Submit attendance error:', error);
      setSubmitState(prev => ({
        ...prev,
        isSubmitting: false,
        error: error.message
      }));
      toast.error(error.message);
      throw error;
    }
  }, [location, getCurrentLocation, networkState, detectNetwork]);

  // Manual WiFi SSID input
  const setManualWifiSSID = useCallback((ssid) => {
    setNetworkState(prev => ({
      ...prev,
      wifiSSID: ssid
    }));
  }, []);

  // Toggle manual WiFi mode
  const toggleManualWifiMode = useCallback(() => {
    setNetworkState(prev => ({
      ...prev,
      manualWifiMode: !prev.manualWifiMode,
      wifiSSID: ''
    }));
  }, []);

  // Get validation summary for UI display
  const getValidationSummary = useCallback(() => {
    if (!validationState.validationResults) return null;

    const results = validationState.validationResults;
    return {
      score: results.score,
      scoreColor: results.score >= 80 ? 'green' : results.score >= 60 ? 'yellow' : 'red',
      requiresApproval: results.requiresApproval,
      checks: {
        location: {
          valid: results.location?.isValid || false,
          message: results.location?.isValid 
            ? `Lokasi valid: ${results.location.locationName}` 
            : 'Lokasi tidak valid atau di luar area yang diizinkan'
        },
        wifi: {
          valid: results.wifi?.isApproved || false,
          message: results.wifi?.isApproved 
            ? `WiFi disetujui: ${results.wifi.networkInfo?.ssid}` 
            : 'WiFi tidak disetujui atau tidak terdeteksi'
        },
        device: {
          valid: results.device?.isRegistered || false,
          message: results.device?.isRegistered 
            ? 'Device terdaftar' 
            : 'Device belum terdaftar atau menunggu approval'
        },
        workHours: {
          valid: results.workHours?.isWithinHours || false,
          message: results.workHours?.isWithinHours 
            ? 'Dalam jam kerja' 
            : `Di luar jam kerja (${results.workHours?.currentTime})`
        },
        selfie: {
          valid: results.selfie?.present || false,
          message: results.selfie?.present ? 'Selfie tersedia' : 'Selfie diperlukan'
        }
      },
      errors: results.errors || []
    };
  }, [validationState.validationResults]);

  // Reset all states
  const resetStates = useCallback(() => {
    setValidationState({
      isValidating: false,
      validationResults: null,
      error: null,
      lastValidation: null
    });
    setSubmitState({
      isSubmitting: false,
      error: null,
      lastSubmission: null
    });
  }, []);

  return {
    // Validation state
    validation: validationState,
    runValidation,
    getValidationSummary,
    
    // Submit state
    submit: submitState,
    submitAttendance,
    
    // Network state
    network: networkState,
    detectNetwork,
    setManualWifiSSID,
    toggleManualWifiMode,
    
    // Device state
    device: deviceState,
    generateDeviceFingerprint,
    checkDeviceRegistration,
    registerDevice,
    
    // Location (from useGeolocation hook)
    location,
    isGettingLocation,
    getCurrentLocation,
    
    // Utilities
    resetStates,
    
    // Combined loading state
    isLoading: validationState.isValidating || submitState.isSubmitting || isGettingLocation || networkState.isDetecting || deviceState.isGenerating
  };
};

// Helper hook for admin approval operations
export const useAttendanceApproval = () => {
  const [approvalState, setApprovalState] = useState({
    isLoading: false,
    pendingApprovals: [],
    error: null
  });

  // Fetch pending approvals
  const fetchPendingApprovals = useCallback(async (filters = {}) => {
    setApprovalState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      let query = supabase
        .from('attendance_approval_queue')
        .select(`
          *,
          attendance (
            *,
            profiles (full_name, employee_id)
          )
        `)
        .eq('requires_manual_review', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      // Apply filters
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.submissionType) {
        query = query.eq('submission_type', filters.submissionType);
      }
      if (filters.scoreThreshold) {
        query = query.lt('auto_validation_score', filters.scoreThreshold);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      setApprovalState(prev => ({
        ...prev,
        isLoading: false,
        pendingApprovals: data || []
      }));

      return data;
    } catch (error) {
      console.error('Fetch pending approvals error:', error);
      setApprovalState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      throw error;
    }
  }, []);

  // Approve attendance
  const approveAttendance = useCallback(async (attendanceId, approvalQueueId, adminNotes = '') => {
    try {
      // Update attendance record
      const { error: attendanceError } = await supabase
        .from('attendance')
        .update({
          approval_status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', attendanceId);

      if (attendanceError) throw attendanceError;

      // Update approval queue
      const { error: queueError } = await supabase
        .from('attendance_approval_queue')
        .update({
          requires_manual_review: false,
          reviewed_by: (await supabase.auth.getUser()).data.user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: adminNotes || 'Approved by admin'
        })
        .eq('id', approvalQueueId);

      if (queueError) throw queueError;

      // Refresh pending approvals
      await fetchPendingApprovals();
      
      toast.success('Absensi berhasil disetujui');
      return { success: true };
    } catch (error) {
      console.error('Approve attendance error:', error);
      toast.error('Gagal menyetujui absensi');
      return { success: false, error: error.message };
    }
  }, [fetchPendingApprovals]);

  // Reject attendance
  const rejectAttendance = useCallback(async (attendanceId, approvalQueueId, rejectionReason) => {
    if (!rejectionReason?.trim()) {
      throw new Error('Alasan penolakan harus diisi');
    }

    try {
      // Update attendance record
      const { error: attendanceError } = await supabase
        .from('attendance')
        .update({
          approval_status: 'rejected',
          approved_by: (await supabase.auth.getUser()).data.user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', attendanceId);

      if (attendanceError) throw attendanceError;

      // Update approval queue
      const { error: queueError } = await supabase
        .from('attendance_approval_queue')
        .update({
          requires_manual_review: false,
          reviewed_by: (await supabase.auth.getUser()).data.user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: `Rejected: ${rejectionReason}`
        })
        .eq('id', approvalQueueId);

      if (queueError) throw queueError;

      // Refresh pending approvals
      await fetchPendingApprovals();
      
      toast.success('Absensi berhasil ditolak');
      return { success: true };
    } catch (error) {
      console.error('Reject attendance error:', error);
      toast.error('Gagal menolak absensi');
      return { success: false, error: error.message };
    }
  }, [fetchPendingApprovals]);

  return {
    approvalState,
    fetchPendingApprovals,
    approveAttendance,
    rejectAttendance
  };
};