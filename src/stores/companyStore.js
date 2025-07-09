import { create } from 'zustand'
import { supabaseHelpers } from '../lib/supabase'

export const useCompanyStore = create((set) => ({
  settings: {},
  isLoading: false,

  // Actions
  setSettings: (settings) => set({ settings }),
  setLoading: (isLoading) => set({ isLoading }),

  // Get company settings
  getSettings: async () => {
    set({ isLoading: true })
    
    try {
      const { data, error } = await supabaseHelpers.getCompanySettings()
      
      if (error) throw error
      
      // Convert array to object for easier access
      const settingsObj = {}
      data.forEach(setting => {
        settingsObj[setting.key] = setting.value
      })
      
      set({ settings: settingsObj })
    } catch (error) {
      console.error('Error fetching company settings:', error)
    } finally {
      set({ isLoading: false })
    }
  }
}))