import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '../types'
import { authApi } from '../services/api'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    firstName: string
    lastName: string
    email: string
    password: string
    role?: string
  }) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await authApi.login({ email, password })
          if (response.success && response.data) {
            const { user, token } = response.data
            localStorage.setItem('token', token)
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            })
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          const response = await authApi.register({
            ...data,
            confirmPassword: data.password,
          })
          if (response.success && response.data) {
            const { user, token } = response.data
            localStorage.setItem('token', token)
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            })
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token')
        if (!token) {
          set({ isAuthenticated: false })
          return
        }

        set({ isLoading: true })
        try {
          const response = await authApi.getProfile()
          if (response.success && response.data) {
            set({
              user: response.data.user,
              token,
              isAuthenticated: true,
              isLoading: false,
            })
          } else {
            localStorage.removeItem('token')
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            })
          }
        } catch (error) {
          localStorage.removeItem('token')
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      updateProfile: async (data) => {
        try {
          const response = await authApi.updateProfile(data)
          if (response.success && response.data) {
            set({ user: response.data.user })
          }
        } catch (error) {
          throw error
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
