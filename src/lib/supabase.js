// src/lib/supabase.js - Complete Implementation with Improved Selfie Features
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for common operations
export const supabaseHelpers = {
  // ============================================
  // AUTH HELPERS
  // ============================================
  
  async signUp(email, password, userData) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: undefined // Disable email redirect
        }
      })
      return { data, error }
    } catch (error) {
      console.error('SignUp error:', error)
      return { data: null, error }
    }
  },

  async signIn(email, password) {
    try {
      // First try normal sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      // Handle unconfirmed email error
      if (error && error.message.includes('Email not confirmed')) {
        return { 
          data: null, 
          error: { 
            ...error, 
            message: 'Email belum dikonfirmasi. Hubungi admin untuk mengaktifkan akun.' 
          } 
        }
      }
      
      return { data, error }
    } catch (error) {
      console.error('SignIn error:', error)
      return { data: null, error }
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      console.error('SignOut error:', error)
      return { error }
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      console.error('GetCurrentUser error:', error)
      return null
    }
  },

  async getCurrentSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    } catch (error) {
      console.error('GetCurrentSession error:', error)
      return null
    }
  },

  // ============================================
  // PROFILE HELPERS
  // ============================================

  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return { data: data || null, error: null }
    } catch (error) {
      console.error('Error fetching profile:', error)
      return { data: null, error }
    }
  },

  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Error updating profile:', error)
      return { data: null, error }
    }
  },

  async createProfile(profileData) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Error creating profile:', error)
      return { data: null, error }
    }
  },

  async getAllProfiles() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      return { data: data || [], error }
    } catch (error) {
      console.error('Error fetching all profiles:', error)
      return { data: [], error }
    }
  },

  // ============================================
  // ATTENDANCE HELPERS
  // ============================================

  async getTodayAttendance(userId) {
    const today = new Date().toISOString().split('T')[0]
    
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return { data: data || null, error: null }
    } catch (error) {
      console.error('Error fetching today attendance:', error)
      return { data: null, error }
    }
  },

  async getAttendanceByDate(userId, date) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return { data: data || null, error: null }
    } catch (error) {
      console.error('Error fetching attendance by date:', error)
      return { data: null, error }
    }
  },

  async getAttendanceHistory(userId, limit = 30) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit)
      
      return { data: data || [], error }
    } catch (error) {
      console.error('Error fetching attendance history:', error)
      return { data: [], error }
    }
  },

  async getAllAttendanceByDate(date) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles(full_name, employee_id)
        `)
        .eq('date', date)
        .order('created_at', { ascending: false })
      
      return { data: data || [], error }
    } catch (error) {
      console.error('Error fetching all attendance by date:', error)
      return { data: [], error }
    }
  },

  // ============================================
  // IMPROVED SELFIE & FILE STORAGE HELPERS
  // ============================================

  // Helper function untuk convert blob ke file
  blobToFile(blob, fileName) {
    return new File([blob], fileName, {
      type: 'image/jpeg',
      lastModified: Date.now()
    })
  },

  // Resize image sebelum upload (optimization)
  async resizeImage(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height)
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to blob
        canvas.toBlob(resolve, 'image/jpeg', quality)
      }
      
      img.src = URL.createObjectURL(file)
    })
  },

  // Improved selfie upload with better error handling
  async uploadSelfie(file, userId, type) {
    try {
      // Validate file
      if (!file) {
        throw new Error('File tidak tersedia')
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('Ukuran file terlalu besar (maksimal 10MB)')
      }

      // Create filename dengan timestamp untuk uniqueness
      const timestamp = Date.now()
      const fileName = `${userId}/${type}_${timestamp}.jpg`
      
      console.log('Uploading selfie:', fileName)
      
      // Upload file ke Supabase Storage
      const { data, error } = await supabase.storage
        .from('selfies')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        })
      
      if (error) {
        console.error('Storage upload error:', error)
        throw new Error(`Upload failed: ${error.message}`)
      }
      
      console.log('Upload successful:', data)
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('selfies')
        .getPublicUrl(fileName)
      
      if (!publicUrl) {
        throw new Error('Failed to get public URL')
      }
      
      console.log('Public URL:', publicUrl)
      
      return { data: publicUrl, error: null }
    } catch (error) {
      console.error('Error uploading selfie:', error)
      return { data: null, error: error.message || 'Gagal upload selfie' }
    }
  },

  async deleteSelfie(filePath) {
    try {
      const { data, error } = await supabase.storage
        .from('selfies')
        .remove([filePath])
      
      return { data, error }
    } catch (error) {
      console.error('Error deleting selfie:', error)
      return { data: null, error }
    }
  },

  // Clean up old selfies (untuk auto-delete setelah 24 jam)
  async cleanupOldSelfies(userId) {
    try {
      const { data: files, error } = await supabase.storage
        .from('selfies')
        .list(userId)
      
      if (error) throw error
      
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      const oldFiles = files.filter(file => {
        const fileDate = new Date(file.created_at)
        return fileDate < oneDayAgo
      })
      
      if (oldFiles.length > 0) {
        const filePaths = oldFiles.map(file => `${userId}/${file.name}`)
        
        const { error: deleteError } = await supabase.storage
          .from('selfies')
          .remove(filePaths)
        
        if (deleteError) throw deleteError
        
        console.log(`Cleaned up ${oldFiles.length} old selfies for user ${userId}`)
      }
      
      return { success: true, deletedCount: oldFiles.length }
    } catch (error) {
      console.error('Error cleaning up old selfies:', error)
      return { success: false, error: error.message }
    }
  },

  // Check storage quota
  async getStorageUsage(userId) {
    try {
      const { data: files, error } = await supabase.storage
        .from('selfies')
        .list(userId)
      
      if (error) throw error
      
      const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
      const fileCount = files.length
      
      return {
        data: {
          totalSize,
          fileCount,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        },
        error: null
      }
    } catch (error) {
      console.error('Error getting storage usage:', error)
      return { data: null, error: error.message }
    }
  },

  // Enhanced check-in dengan improved selfie handling
  async checkIn(userId, location, selfieBlob) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()
    
    try {
      let selfieUrl = null
      
      // Upload selfie if provided
      if (selfieBlob) {
        console.log('Starting selfie upload for check-in...')
        
        // Convert blob to file
        const selfieFile = this.blobToFile(selfieBlob, `checkin_${userId}_${Date.now()}.jpg`)
        
        // Optionally resize image
        const resizedBlob = await this.resizeImage(selfieFile)
        const resizedFile = this.blobToFile(resizedBlob, selfieFile.name)
        
        const uploadResult = await this.uploadSelfie(resizedFile, userId, 'checkin')
        
        if (uploadResult.error) {
          throw new Error(`Gagal upload selfie: ${uploadResult.error}`)
        }
        
        selfieUrl = uploadResult.data
        console.log('Selfie uploaded successfully:', selfieUrl)
      }
      
      // Save attendance record
      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          user_id: userId,
          date: today,
          check_in_time: now,
          check_in_location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
          check_in_selfie_url: selfieUrl,
          status: 'incomplete',
          updated_at: now
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single()
      
      if (error) {
        // If attendance save fails but selfie was uploaded, should we delete it?
        console.error('Attendance save error:', error)
        throw error
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Error checking in:', error)
      return { data: null, error: error.message || 'Gagal check-in' }
    }
  },

  // Enhanced check-out dengan improved selfie handling
  async checkOut(userId, location, selfieBlob) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()
    
    try {
      let selfieUrl = null
      
      // Upload selfie if provided
      if (selfieBlob) {
        console.log('Starting selfie upload for check-out...')
        
        // Convert blob to file
        const selfieFile = this.blobToFile(selfieBlob, `checkout_${userId}_${Date.now()}.jpg`)
        
        // Optionally resize image
        const resizedBlob = await this.resizeImage(selfieFile)
        const resizedFile = this.blobToFile(resizedBlob, selfieFile.name)
        
        const uploadResult = await this.uploadSelfie(resizedFile, userId, 'checkout')
        
        if (uploadResult.error) {
          throw new Error(`Gagal upload selfie: ${uploadResult.error}`)
        }
        
        selfieUrl = uploadResult.data
        console.log('Selfie uploaded successfully:', selfieUrl)
      }
      
      // Update attendance record
      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out_time: now,
          check_out_location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
          check_out_selfie_url: selfieUrl,
          updated_at: now
        })
        .eq('user_id', userId)
        .eq('date', today)
        .select()
        .single()
      
      if (error) {
        console.error('Attendance update error:', error)
        throw error
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Error checking out:', error)
      return { data: null, error: error.message || 'Gagal check-out' }
    }
  },

  // ============================================
  // BONUS SYSTEM HELPERS
  // ============================================

  async getPendingBonuses() {
    try {
      const { data, error } = await supabase
        .from('bonus_pending')
        .select(`
          *,
          from_profile:profiles!bonus_pending_from_user_id_fkey(full_name, employee_id),
          to_profile:profiles!bonus_pending_to_user_id_fkey(full_name, employee_id)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      
      return { data: data || [], error }
    } catch (error) {
      console.error('Error fetching pending bonuses:', error)
      return { data: [], error }
    }
  },

  async createBonusRequest(fromUserId, toUserId, date, lateMinutes, reason) {
    try {
      const { data, error } = await supabase
        .from('bonus_pending')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          date,
          late_minutes: lateMinutes,
          reason,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Error creating bonus request:', error)
      return { data: null, error }
    }
  },

  async approveBonusRequest(bonusId, adminId, adminNotes = '') {
    try {
      const { data, error } = await supabase
        .from('bonus_pending')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          approved_by: adminId,
          approved_at: new Date().toISOString()
        })
        .eq('id', bonusId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Error approving bonus:', error)
      return { data: null, error }
    }
  },

  async rejectBonusRequest(bonusId, adminId, adminNotes = '') {
    try {
      const { data, error } = await supabase
        .from('bonus_pending')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          approved_by: adminId,
          approved_at: new Date().toISOString()
        })
        .eq('id', bonusId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Error rejecting bonus:', error)
      return { data: null, error }
    }
  },

  async getApprovedBonuses(userId) {
    try {
      const { data, error } = await supabase
        .from('bonus_approved')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      return { data: data || [], error }
    } catch (error) {
      console.error('Error fetching approved bonuses:', error)
      return { data: [], error }
    }
  },

  async createApprovedBonus(userId, bonusMinutes, date, sourceBonusId) {
    try {
      const { data, error } = await supabase
        .from('bonus_approved')
        .insert({
          user_id: userId,
          bonus_minutes: bonusMinutes,
          date,
          source_bonus_id: sourceBonusId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Error creating approved bonus:', error)
      return { data: null, error }
    }
  },

  // ============================================
  // SALARY SLIP HELPERS
  // ============================================

  async getSalarySlips(userId) {
    try {
      const { data, error } = await supabase
        .from('salary_slips')
        .select('*')
        .eq('user_id', userId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
      
      return { data: data || [], error }
    } catch (error) {
      console.error('Error fetching salary slips:', error)
      return { data: [], error }
    }
  },

  async getAllSalarySlips() {
    try {
      const { data, error } = await supabase
        .from('salary_slips')
        .select(`
          *,
          profiles(full_name, employee_id)
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
      
      return { data: data || [], error }
    } catch (error) {
      console.error('Error fetching all salary slips:', error)
      return { data: [], error }
    }
  },

  async createSalarySlip(salaryData) {
    try {
      const { data, error } = await supabase
        .from('salary_slips')
        .insert({
          ...salaryData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Error creating salary slip:', error)
      return { data: null, error }
    }
  },

  async updateSalarySlip(slipId, updates) {
    try {
      const { data, error } = await supabase
        .from('salary_slips')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', slipId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Error updating salary slip:', error)
      return { data: null, error }
    }
  },

  async finalizeSalarySlip(slipId, adminId) {
    try {
      const { data, error } = await supabase
        .from('salary_slips')
        .update({
          status: 'finalized',
          finalized_by: adminId,
          finalized_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', slipId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Error finalizing salary slip:', error)
      return { data: null, error }
    }
  },

  // ============================================
  // COMPANY SETTINGS HELPERS
  // ============================================

  async getCompanySettings() {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .order('key')
      
      return { data: data || [], error }
    } catch (error) {
      console.error('Error fetching company settings:', error)
      return { data: [], error }
    }
  },

  async getCompanySettingsObject() {
    try {
      const { data, error } = await this.getCompanySettings()
      
      if (error) throw error
      
      // Convert array to object for easier access
      const settingsObj = {}
      data.forEach(setting => {
        settingsObj[setting.key] = setting.value
      })
      
      return { data: settingsObj, error: null }
    } catch (error) {
      console.error('Error fetching company settings object:', error)
      return { data: {}, error }
    }
  },

  async updateCompanySetting(key, value, description = null) {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .upsert({
          key,
          value,
          description,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Error updating company setting:', error)
      return { data: null, error }
    }
  },

  // ============================================
  // AUDIT LOG HELPERS
  // ============================================

  async createAuditLog(userId, action, tableName, recordId, oldData = null, newData = null) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action,
          table_name: tableName,
          record_id: recordId,
          old_data: oldData,
          new_data: newData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('Error creating audit log:', error)
      return { data: null, error }
    }
  },

  async getAuditLogs(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles(full_name, employee_id)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      return { data: data || [], error }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      return { data: [], error }
    }
  },

  // ============================================
  // UTILITY HELPERS
  // ============================================

  async testConnection() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
      
      if (error) throw error
      
      return { success: true, error: null }
    } catch (error) {
      console.error('Connection test failed:', error)
      return { success: false, error }
    }
  },

  // Real-time subscriptions
  subscribeToTableChanges(table, callback, filter = null) {
    let subscription = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table,
        filter: filter
      }, callback)
      .subscribe()

    return subscription
  },

  unsubscribe(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription)
    }
  },

  // Batch operations
  async batchInsert(table, records) {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert(records)
        .select()
      
      return { data: data || [], error }
    } catch (error) {
      console.error(`Error batch inserting to ${table}:`, error)
      return { data: [], error }
    }
  },

  async batchUpdate(table, updates, filterColumn, filterValues) {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .in(filterColumn, filterValues)
        .select()
      
      return { data: data || [], error }
    } catch (error) {
      console.error(`Error batch updating ${table}:`, error)
      return { data: [], error }
    }
  },

  // ============================================
  // ADVANCED HELPERS
  // ============================================

  // Generate attendance report
  async generateAttendanceReport(startDate, endDate, userId = null) {
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          profiles(full_name, employee_id, base_salary, rate_per_minute)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      // Calculate summary statistics
      const summary = {
        totalRecords: data.length,
        totalMinutes: data.reduce((sum, record) => sum + (record.total_minutes || 0), 0),
        completedDays: data.filter(record => record.status === 'completed').length,
        incompleteDays: data.filter(record => record.status === 'incomplete').length
      }

      return { data: { records: data, summary }, error: null }
    } catch (error) {
      console.error('Error generating attendance report:', error)
      return { data: null, error }
    }
  },

  // Bulk attendance operations
  async bulkUpdateAttendance(updates) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .upsert(updates, {
          onConflict: 'user_id,date'
        })
        .select()

      return { data: data || [], error }
    } catch (error) {
      console.error('Error bulk updating attendance:', error)
      return { data: [], error }
    }
  },

  // Employee performance metrics
  async getEmployeeMetrics(userId, period = 30) {
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { data: attendance, error: attendanceError } = await this.getAttendanceHistory(userId, period)
      if (attendanceError) throw attendanceError

      const { data: bonuses, error: bonusError } = await this.getApprovedBonuses(userId)
      if (bonusError) throw bonusError

      // Calculate metrics
      const metrics = {
        workingDays: attendance.filter(a => a.status === 'completed').length,
        totalMinutes: attendance.reduce((sum, a) => sum + (a.total_minutes || 0), 0),
        averageMinutesPerDay: 0,
        totalBonusMinutes: bonuses.reduce((sum, b) => sum + (b.bonus_minutes || 0), 0),
        attendanceRate: 0
      }

      if (metrics.workingDays > 0) {
        metrics.averageMinutesPerDay = Math.round(metrics.totalMinutes / metrics.workingDays)
        metrics.attendanceRate = Math.round((metrics.workingDays / period) * 100)
      }

      return { data: metrics, error: null }
    } catch (error) {
      console.error('Error getting employee metrics:', error)
      return { data: null, error }
    }
  },

  // System health check
  async performHealthCheck() {
    try {
      const checks = []

      // Test database connection
      const dbTest = await this.testConnection()
      checks.push({
        name: 'Database Connection',
        status: dbTest.success ? 'healthy' : 'error',
        message: dbTest.success ? 'Connected' : dbTest.error?.message
      })

      // Test storage access
      try {
        const { data: buckets } = await supabase.storage.listBuckets()
        const selfiesBucket = buckets?.find(b => b.id === 'selfies')
        checks.push({
          name: 'Storage Access',
          status: selfiesBucket ? 'healthy' : 'warning',
          message: selfiesBucket ? 'Selfies bucket accessible' : 'Selfies bucket not found'
        })
      } catch (storageError) {
        checks.push({
          name: 'Storage Access',
          status: 'error',
          message: storageError.message
        })
      }

      // Test authentication
      try {
        const user = await this.getCurrentUser()
        checks.push({
          name: 'Authentication',
          status: user ? 'healthy' : 'warning',
          message: user ? 'User authenticated' : 'No authenticated user'
        })
      } catch (authError) {
        checks.push({
          name: 'Authentication',
          status: 'error',
          message: authError.message
        })
      }

      const overallStatus = checks.every(c => c.status === 'healthy') ? 'healthy' :
                           checks.some(c => c.status === 'error') ? 'error' : 'warning'

      return {
        data: {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          checks
        },
        error: null
      }
    } catch (error) {
      console.error('Error performing health check:', error)
      return { data: null, error }
    }
  },

  // Clean up expired data
  async cleanupExpiredData() {
    try {
      const results = []

      // Clean up old selfies for all users
      const { data: profiles } = await this.getAllProfiles()
      if (profiles) {
        for (const profile of profiles) {
          const cleanupResult = await this.cleanupOldSelfies(profile.id)
          if (cleanupResult.success && cleanupResult.deletedCount > 0) {
            results.push({
              userId: profile.id,
              deletedFiles: cleanupResult.deletedCount
            })
          }
        }
      }

      // Clean up old audit logs (keep only last 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const { error: auditError } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', ninetyDaysAgo)

      if (auditError) {
        console.error('Error cleaning up audit logs:', auditError)
      }

      return {
        data: {
          selfieCleanup: results,
          auditLogsCleanup: !auditError
        },
        error: null
      }
    } catch (error) {
      console.error('Error cleaning up expired data:', error)
      return { data: null, error }
    }
  },

  // Export data functions
  async exportAttendanceData(startDate, endDate, format = 'json') {
    try {
      const { data: reportData, error } = await this.generateAttendanceReport(startDate, endDate)
      if (error) throw error

      switch (format.toLowerCase()) {
        case 'csv':
          return this.convertToCSV(reportData.records)
        case 'json':
        default:
          return { data: reportData, error: null }
      }
    } catch (error) {
      console.error('Error exporting attendance data:', error)
      return { data: null, error }
    }
  },

  // Helper function to convert data to CSV
  convertToCSV(data) {
    if (!data || data.length === 0) {
      return { data: '', error: null }
    }

    try {
      const headers = Object.keys(data[0]).filter(key => 
        !key.includes('_location') && !key.includes('_selfie_url')
      )
      
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            if (value === null || value === undefined) return ''
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ].join('\n')

      return { data: csvContent, error: null }
    } catch (error) {
      console.error('Error converting to CSV:', error)
      return { data: null, error }
    }
  },

  // Advanced search functionality
  async searchEmployees(searchTerm, filters = {}) {
    try {
      let query = supabase
        .from('profiles')
        .select('*')

      // Apply text search
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,employee_id.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      }

      // Apply filters
      if (filters.role) {
        query = query.eq('role', filters.role)
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }
      if (filters.hireDateAfter) {
        query = query.gte('hire_date', filters.hireDateAfter)
      }
      if (filters.hireDateBefore) {
        query = query.lte('hire_date', filters.hireDateBefore)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      return { data: data || [], error }
    } catch (error) {
      console.error('Error searching employees:', error)
      return { data: [], error }
    }
  },

  // Get dashboard statistics
  async getDashboardStats() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()

      // Fetch all required data in parallel
      const [
        employeesResult,
        todayAttendanceResult,
        pendingBonusesResult,
        monthlyPayrollResult
      ] = await Promise.all([
        this.getAllProfiles(),
        this.getAllAttendanceByDate(today),
        this.getPendingBonuses(),
        supabase
          .from('salary_slips')
          .select('total_salary')
          .eq('month', currentMonth)
          .eq('year', currentYear)
      ])

      const stats = {
        totalEmployees: employeesResult.data?.filter(emp => 
          emp.role === 'employee' && emp.is_active
        ).length || 0,
        activeToday: todayAttendanceResult.data?.length || 0,
        pendingBonuses: pendingBonusesResult.data?.length || 0,
        monthlyPayroll: monthlyPayrollResult.data?.reduce(
          (sum, slip) => sum + Number(slip.total_salary), 0
        ) || 0
      }

      return { data: stats, error: null }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      return { data: null, error }
    }
  },

  // Notification helpers
  async createNotification(userId, title, message, type = 'info') {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error creating notification:', error)
      return { data: null, error }
    }
  },

  async getUnreadNotifications(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      return { data: data || [], error }
    } catch (error) {
      console.error('Error getting unread notifications:', error)
      return { data: [], error }
    }
  },

  async markNotificationAsRead(notificationId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return { data: null, error }
    }
  }
}