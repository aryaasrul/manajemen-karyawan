import { create } from 'zustand'
import { supabase, supabaseHelpers } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),

  // Initialize auth state
  initialize: async () => {
    set({ isLoading: true })
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Fetch profile dengan retry mechanism
        let profile = null
        let retries = 3
        
        while (retries > 0 && !profile) {
          try {
            const { data: profileData, error } = await supabaseHelpers.getProfile(session.user.id)
            if (!error) {
              profile = profileData
              break
            }
            retries--
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (err) {
            retries--
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
        
        set({ 
          user: session.user, 
          profile,
          isAuthenticated: true 
        })
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // Sign in with auto-redirect
  signIn: async (email, password) => {
    const { data, error } = await supabaseHelpers.signIn(email, password)
    
    if (data.user && !error) {
      // Fetch profile
      const { data: profile } = await supabaseHelpers.getProfile(data.user.id)
      
      set({ 
        user: data.user, 
        profile,
        isAuthenticated: true 
      })
    }
    
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabaseHelpers.signOut()
    set({ 
      user: null, 
      profile: null,
      isAuthenticated: false 
    })
    return { error }
  },

  // Update profile
  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return { error: 'Not authenticated' }
    
    const { data, error } = await supabaseHelpers.updateProfile(user.id, updates)
    
    if (data) {
      set({ profile: data })
    }
    
    return { data, error }
  },

  // Helper getters
  isAdmin: () => {
    const { profile } = get()
    return profile?.role === 'admin'
  },

  isEmployee: () => {
    const { profile } = get()
    return profile?.role === 'employee'
  }
}))
