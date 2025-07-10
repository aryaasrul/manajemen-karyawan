// ============================================
// FILE: src/lib/attendanceValidation.js
// Enhanced Attendance Validation System
// ============================================

import { supabase } from './supabase';
import { supabaseHelpers } from './supabase';

export class AttendanceValidator {
  
  // 1. WiFi Network Detection
  static async detectWiFiNetwork() {
    try {
      const networkInfo = {
        ssid: null,
        bssid: null,
        type: null,
        strength: null,
        timestamp: new Date().toISOString()
      };

      // Method 1: Navigator Connection API (limited support)
      if ('connection' in navigator) {
        const connection = navigator.connection;
        networkInfo.type = connection.type;
        networkInfo.effectiveType = connection.effectiveType;
        networkInfo.downlink = connection.downlink;
        networkInfo.rtt = connection.rtt;
      }

      // Method 2: WebRTC for network discovery
      const webrtcInfo = await this.getNetworkInfoViaWebRTC();
      networkInfo.localIPs = webrtcInfo.localIPs;
      networkInfo.candidates = webrtcInfo.candidates;

      // Method 3: Try to get WiFi info from available APIs
      // Note: Direct WiFi SSID access is restricted in browsers for security
      // We'll use alternative methods or require manual input
      
      return networkInfo;
    } catch (error) {
      console.error('WiFi detection error:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // WebRTC Network Info Discovery
  static async getNetworkInfoViaWebRTC() {
    return new Promise((resolve, reject) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      const candidates = [];
      let timeout;
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          candidates.push(event.candidate.candidate);
        } else {
          // ICE gathering complete
          clearTimeout(timeout);
          pc.close();
          resolve({
            candidates,
            localIPs: this.extractLocalIPs(candidates),
            networkInterfaces: this.analyzeNetworkCandidates(candidates)
          });
        }
      };
      
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          pc.close();
          resolve({
            candidates,
            localIPs: this.extractLocalIPs(candidates),
            networkInterfaces: this.analyzeNetworkCandidates(candidates)
          });
        }
      };
      
      // Create data channel to trigger ICE gathering
      pc.createDataChannel('network-discovery');
      
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(reject);
      
      // Timeout after 10 seconds
      timeout = setTimeout(() => {
        pc.close();
        resolve({
          candidates,
          localIPs: this.extractLocalIPs(candidates),
          networkInterfaces: this.analyzeNetworkCandidates(candidates)
        });
      }, 10000);
    });
  }

  // Extract local IP addresses from ICE candidates
  static extractLocalIPs(candidates) {
    const ips = new Set();
    const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
    
    candidates.forEach(candidate => {
      const matches = candidate.match(ipRegex);
      if (matches) {
        matches.forEach(ip => {
          // Filter out loopback and invalid IPs
          if (ip !== '127.0.0.1' && !ip.startsWith('169.254.')) {
            ips.add(ip);
          }
        });
      }
    });
    
    return Array.from(ips);
  }

  // Analyze network candidates to determine connection type
  static analyzeNetworkCandidates(candidates) {
    const interfaces = {
      wifi: false,
      ethernet: false,
      cellular: false,
      vpn: false
    };

    candidates.forEach(candidate => {
      if (candidate.includes('typ host')) {
        // Local network interface
        if (candidate.includes('192.168.') || candidate.includes('10.') || candidate.includes('172.')) {
          interfaces.wifi = true; // Likely WiFi/LAN
        }
      } else if (candidate.includes('typ srflx')) {
        // Server reflexive (through NAT)
        interfaces.ethernet = true;
      } else if (candidate.includes('typ relay')) {
        // TURN relay (might indicate cellular or restricted network)
        interfaces.cellular = true;
      }
    });

    return interfaces;
  }

  // 2. Device Fingerprinting
  static async generateDeviceFingerprint() {
    const components = [];
    
    try {
      // Screen characteristics
      components.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
      components.push(`pixelRatio:${window.devicePixelRatio || 1}`);
      
      // Browser and system info
      components.push(`userAgent:${this.hashString(navigator.userAgent)}`);
      components.push(`platform:${navigator.platform}`);
      components.push(`language:${navigator.language}`);
      components.push(`languages:${navigator.languages?.join(',') || ''}`);
      
      // Timezone
      components.push(`timezone:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
      components.push(`timezoneOffset:${new Date().getTimezoneOffset()}`);
      
      // Hardware capabilities
      if (navigator.hardwareConcurrency) {
        components.push(`cores:${navigator.hardwareConcurrency}`);
      }
      
      if (navigator.deviceMemory) {
        components.push(`memory:${navigator.deviceMemory}`);
      }
      
      // Canvas fingerprint
      const canvasFingerprint = await this.generateCanvasFingerprint();
      components.push(`canvas:${canvasFingerprint}`);
      
      // WebGL fingerprint
      const webglFingerprint = this.generateWebGLFingerprint();
      components.push(`webgl:${webglFingerprint}`);
      
      // Audio context fingerprint
      const audioFingerprint = await this.generateAudioFingerprint();
      components.push(`audio:${audioFingerprint}`);
      
      // Combine all components
      const combined = components.join('|');
      return await this.hashString(combined);
      
    } catch (error) {
      console.error('Device fingerprinting error:', error);
      // Fallback to basic fingerprint
      return await this.hashString(`${navigator.userAgent}|${screen.width}x${screen.height}|${Date.now()}`);
    }
  }

  // Canvas fingerprinting
  static async generateCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 280;
      canvas.height = 60;
      
      // Draw various shapes and text
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      
      ctx.fillStyle = '#069';
      ctx.fillText('Attendance System 🏢', 2, 15);
      
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Device ID Validation', 4, 35);
      
      // Add some geometric shapes
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 20, 0, Math.PI * 2);
      ctx.fill();
      
      const dataURL = canvas.toDataURL();
      return await this.hashString(dataURL);
    } catch (error) {
      return 'canvas_error';
    }
  }

  // WebGL fingerprinting
  static generateWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) return 'no_webgl';
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      
      return `${vendor}|${renderer}`.substring(0, 32);
    } catch (error) {
      return 'webgl_error';
    }
  }

  // Audio context fingerprinting
  static async generateAudioFingerprint() {
    try {
      if (!window.AudioContext && !window.webkitAudioContext) {
        return 'no_audio_context';
      }
      
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      
      return new Promise((resolve) => {
        let samples = [];
        let sampleCount = 0;
        
        scriptProcessor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          for (let i = 0; i < inputData.length; i++) {
            samples.push(inputData[i]);
            sampleCount++;
            if (sampleCount >= 1000) {
              scriptProcessor.disconnect();
              oscillator.stop();
              audioContext.close();
              
              const sum = samples.reduce((a, b) => a + b, 0);
              resolve(Math.abs(sum).toString().substring(0, 8));
              return;
            }
          }
        };
        
        // Timeout
        setTimeout(() => {
          scriptProcessor.disconnect();
          oscillator.stop();
          audioContext.close();
          resolve('audio_timeout');
        }, 1000);
      });
    } catch (error) {
      return 'audio_error';
    }
  }

  // Hash function using Web Crypto API
  static async hashString(str) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    } catch (error) {
      // Fallback simple hash
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    }
  }

  // 3. Location Validation
  static async validateLocation(latitude, longitude) {
    try {
      const { data, error } = await supabase.rpc('is_location_whitelisted', {
        lat: latitude,
        lng: longitude
      });
      
      if (error) throw error;
      
      return {
        isValid: data?.[0]?.is_valid || false,
        locationId: data?.[0]?.location_id,
        locationName: data?.[0]?.location_name,
        distance: data?.[0]?.distance || null
      };
    } catch (error) {
      console.error('Location validation error:', error);
      return { 
        isValid: false, 
        error: error.message,
        locationId: null,
        locationName: null 
      };
    }
  }

  // 4. WiFi Validation
  static async validateWiFiNetwork(ssid, bssid = null) {
    try {
      const { data, error } = await supabase
        .from('approved_wifi_networks')
        .select('*, whitelist_locations(location_name)')
        .eq('ssid', ssid)
        .eq('is_active', true);
      
      if (error) throw error;
      
      const isApproved = data && data.length > 0;
      
      return {
        isApproved,
        networkInfo: isApproved ? data[0] : null,
        locationName: isApproved ? data[0].whitelist_locations?.location_name : null
      };
    } catch (error) {
      console.error('WiFi validation error:', error);
      return { 
        isApproved: false, 
        error: error.message,
        networkInfo: null 
      };
    }
  }

  // 5. Device Registration Check
  static async checkDeviceRegistration(userId, deviceFingerprint) {
    try {
      const { data, error } = await supabase
        .from('approved_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return {
        isRegistered: !!data,
        device: data,
        needsApproval: !data
      };
    } catch (error) {
      console.error('Device registration check error:', error);
      return { 
        isRegistered: false, 
        error: error.message,
        needsApproval: true 
      };
    }
  }

  // 6. Register New Device
  static async registerDevice(userId, deviceFingerprint, deviceInfo) {
    try {
      // Check if user has reached device limit
      const { data: existingDevices } = await supabase
        .from('approved_devices')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      const { data: maxDevicesSetting } = await supabase
        .from('company_settings')
        .select('value')
        .eq('key', 'max_devices_per_user')
        .single();
      
      const maxDevices = parseInt(maxDevicesSetting?.value || '2');
      
      if (existingDevices && existingDevices.length >= maxDevices) {
        return { 
          success: false, 
          error: `Maksimal ${maxDevices} device per user. Hubungi admin untuk menambah device.` 
        };
      }
      
      const { data, error } = await supabase
        .from('approved_devices')
        .insert({
          user_id: userId,
          device_fingerprint: deviceFingerprint,
          device_name: deviceInfo.name || `Device ${new Date().toISOString().split('T')[0]}`,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            ...deviceInfo
          },
          is_active: false, // Requires admin approval
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { 
        success: true, 
        data,
        message: 'Device berhasil didaftarkan. Menunggu approval admin.' 
      };
    } catch (error) {
      console.error('Device registration error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // 7. Work Hours Validation
  static async validateWorkHours(timestamp = new Date()) {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('key, value')
        .in('key', ['work_start_time', 'work_end_time']);
      
      if (error) throw error;
      
      const settings = data.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      
      const workStart = settings.work_start_time || '09:00';
      const workEnd = settings.work_end_time || '17:00';
      
      const currentTime = timestamp.toTimeString().substring(0, 5); // HH:MM
      const isWithinHours = currentTime >= workStart && currentTime <= workEnd;
      
      return {
        isWithinHours,
        currentTime,
        workStart,
        workEnd,
        timestamp: timestamp.toISOString()
      };
    } catch (error) {
      console.error('Work hours validation error:', error);
      return { 
        isWithinHours: false, 
        error: error.message,
        currentTime: timestamp.toTimeString().substring(0, 5)
      };
    }
  }

  // 8. Calculate Validation Score
  static calculateValidationScore(validationResults) {
    let score = 0;
    const maxScore = 100;
    
    // Location validation (25 points)
    if (validationResults.location?.isValid) {
      score += 25;
    }
    
    // WiFi validation (25 points)
    if (validationResults.wifi?.isApproved) {
      score += 25;
    }
    
    // Device registration (20 points)
    if (validationResults.device?.isRegistered) {
      score += 20;
    }
    
    // Work hours (10 points)
    if (validationResults.workHours?.isWithinHours) {
      score += 10;
    }
    
    // Selfie presence (10 points)
    if (validationResults.selfie?.present) {
      score += 10;
    }
    
    // Network consistency (10 points bonus)
    if (validationResults.network?.consistent) {
      score += 10;
    }
    
    return Math.min(score, maxScore);
  }

  // 9. Comprehensive Attendance Validation
  static async validateAttendance(userId, location, selfieBlob, manualWifiSSID = null) {
    const validationResults = {
      timestamp: new Date().toISOString(),
      location: null,
      wifi: null,
      device: null,
      workHours: null,
      selfie: null,
      network: null,
      score: 0,
      requiresApproval: true,
      errors: []
    };

    try {
      // 1. Location validation
      if (location) {
        validationResults.location = await this.validateLocation(location.latitude, location.longitude);
      } else {
        validationResults.errors.push('GPS location tidak tersedia');
      }

      // 2. Network and WiFi detection
      const networkInfo = await this.detectWiFiNetwork();
      validationResults.network = networkInfo;
      
      // Use manual WiFi SSID if provided (fallback for browsers with limited WiFi access)
      const wifiSSID = manualWifiSSID || networkInfo.ssid;
      if (wifiSSID) {
        validationResults.wifi = await this.validateWiFiNetwork(wifiSSID);
      } else {
        validationResults.errors.push('WiFi SSID tidak terdeteksi');
      }

      // 3. Device fingerprinting and registration
      const deviceFingerprint = await this.generateDeviceFingerprint();
      const deviceCheck = await this.checkDeviceRegistration(userId, deviceFingerprint);
      validationResults.device = {
        ...deviceCheck,
        fingerprint: deviceFingerprint
      };

      // Auto-register device if not registered
      if (!deviceCheck.isRegistered && !deviceCheck.error) {
        const registrationResult = await this.registerDevice(userId, deviceFingerprint, {
          name: `Auto-registered ${new Date().toLocaleDateString()}`,
          registeredAt: new Date().toISOString()
        });
        
        if (registrationResult.success) {
          validationResults.device.registrationAttempted = true;
          validationResults.device.message = registrationResult.message;
        }
      }

      // 4. Work hours validation
      validationResults.workHours = await this.validateWorkHours();

      // 5. Selfie validation
      validationResults.selfie = {
        present: !!selfieBlob,
        size: selfieBlob ? selfieBlob.size : 0,
        type: selfieBlob ? selfieBlob.type : null
      };

      // 6. Calculate overall score
      validationResults.score = this.calculateValidationScore(validationResults);

      // 7. Determine if approval is required
      const { data: thresholdSetting } = await supabase
        .from('company_settings')
        .select('value')
        .eq('key', 'auto_approve_threshold')
        .single();
      
      const autoApproveThreshold = parseInt(thresholdSetting?.value || '80');
      validationResults.requiresApproval = validationResults.score < autoApproveThreshold;

      return validationResults;

    } catch (error) {
      console.error('Comprehensive validation error:', error);
      validationResults.errors.push(error.message);
      return validationResults;
    }
  }

  // 10. Submit Attendance with Enhanced Validation
  static async submitAttendance(userId, attendanceType, location, selfieBlob, manualWifiSSID = null) {
    try {
      // Step 1: Run comprehensive validation
      const validation = await this.validateAttendance(userId, location, selfieBlob, manualWifiSSID);
      
      // Step 2: Upload selfie if provided
      let selfieUrl = null;
      if (selfieBlob) {
        const selfieFile = new File([selfieBlob], `${attendanceType}_${userId}_${Date.now()}.jpg`, {
          type: selfieBlob.type || 'image/jpeg'
        });
        
        const uploadResult = await supabaseHelpers.uploadSelfie(selfieFile, userId, attendanceType);
        if (uploadResult.error) {
          throw new Error(`Gagal upload selfie: ${uploadResult.error}`);
        }
        selfieUrl = uploadResult.data;
      }

      // Step 3: Prepare attendance data
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      const attendanceData = {
        user_id: userId,
        date: today,
        [`${attendanceType}_time`]: now,
        [`${attendanceType}_location`]: location ? `POINT(${location.longitude} ${location.latitude})` : null,
        [`${attendanceType}_selfie_url`]: selfieUrl,
        wifi_mac_address: validation.network?.bssid,
        device_fingerprint: validation.device?.fingerprint,
        network_info: validation.network,
        approval_status: validation.requiresApproval ? 'pending' : 'approved',
        updated_at: now
      };

      // Step 4: Save attendance record
      const { data: attendanceRecord, error: attendanceError } = await supabase
        .from('attendance')
        .upsert(attendanceData, { 
          onConflict: 'user_id,date',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (attendanceError) throw attendanceError;

      // Step 5: Add to approval queue if manual review needed
      if (validation.requiresApproval) {
        const priority = validation.score < 50 ? 3 : (validation.score < 70 ? 2 : 1);
        
        await supabase
          .from('attendance_approval_queue')
          .insert({
            attendance_id: attendanceRecord.id,
            user_id: userId,
            submission_type: attendanceType,
            validation_flags: validation,
            auto_validation_score: validation.score,
            requires_manual_review: true,
            priority: priority
          });
      }

      return {
        success: true,
        data: attendanceRecord,
        validation,
        requiresApproval: validation.requiresApproval,
        message: validation.requiresApproval 
          ? 'Absensi berhasil disubmit. Menunggu approval admin.'
          : 'Absensi berhasil dan otomatis disetujui.'
      };

    } catch (error) {
      console.error('Submit attendance error:', error);
      return {
        success: false,
        error: error.message,
        validation: null
      };
    }
  }
}

// Export default untuk compatibility
export default AttendanceValidator;