import { create } from 'zustand'
import { supabaseHelpers } from '../lib/supabase'

export const useAttendanceStore = create((set, get) => ({
  todayAttendance: null,
  isLoading: false,
  error: null,

  // Actions
  setTodayAttendance: (attendance) => set({ todayAttendance: attendance }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Get today's attendance
  getTodayAttendance: async (userId) => {
    set({ isLoading: true, error: null })
    
    try {
      const { data, error } = await supabaseHelpers.getTodayAttendance(userId)
      
      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error
      }
      
      set({ todayAttendance: data })
    } catch (error) {
      set({ error: error.message })
    } finally {
      set({ isLoading: false })
    }
  },

  // Check in
  checkIn: async (userId, location, selfieFile) => {
    set({ isLoading: true, error: null })
    
    try {
      // Upload selfie first
      const { data: selfieUrl, error: uploadError } = await supabaseHelpers.uploadSelfie(
        selfieFile, 
        userId, 
        'checkin'
      )
      
      if (uploadError) throw uploadError
      
      // Then check in
      const { data, error } = await supabaseHelpers.checkIn(userId, location, selfieUrl)
      
      if (error) throw error
      
      set({ todayAttendance: data })
      return { data, error: null }
    } catch (error) {
      set({ error: error.message })
      return { data: null, error }
    } finally {
      set({ isLoading: false })
    }
  },

  // Check out
  checkOut: async (userId, location, selfieFile) => {
    set({ isLoading: true, error: null })
    
    try {
      // Upload selfie first
      const { data: selfieUrl, error: uploadError } = await supabaseHelpers.uploadSelfie(
        selfieFile, 
        userId, 
        'checkout'
      )
      
      if (uploadError) throw uploadError
      
      // Then check out
      const { data, error } = await supabaseHelpers.checkOut(userId, location, selfieUrl)
      
      if (error) throw error
      
      set({ todayAttendance: data })
      return { data, error: null }
    } catch (error) {
      set({ error: error.message })
      return { data: null, error }
    } finally {
      set({ isLoading: false })
    }
  }
}))