// src/lib/supabase.js - Complete Implementation
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

  async checkIn(userId, location, selfieUrl) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()
    
    try {
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
      
      return { data, error }
    } catch (error) {
      console.error('Error checking in:', error)
      return { data: null, error }
    }
  },

  async checkOut(userId, location, selfieUrl) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()
    
    try {
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
      
      return { data, error }
    } catch (error) {
      console.error('Error checking out:', error)
      return { data: null, error }
    }
  },

  // ============================================
  // FILE STORAGE HELPERS
  // ============================================

  async uploadSelfie(file, userId, type) {
    try {
      const fileName = `${userId}/${type}_${Date.now()}.jpg`
      const { data, error } = await supabase.storage
        .from('selfies')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage
        .from('selfies')
        .getPublicUrl(fileName)
        
      return { data: publicUrl, error: null }
    } catch (error) {
      console.error('Error uploading selfie:', error)
      return { data: null, error }
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
  }
}