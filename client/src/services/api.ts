import axios, { AxiosResponse } from 'axios'
import toast from 'react-hot-toast'
import { ApiResponse, PaginatedResponse, User, Project, Task, Timesheet, ReportData, LoginForm, RegisterForm, ProjectForm, TaskForm, TimesheetForm } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    
    const message = error.response?.data?.message || 'An error occurred'
    toast.error(message)
    
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: async (data: LoginForm): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterForm): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get('/auth/profile')
    return response.data
  },

  updateProfile: async (data: Partial<User>): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.put('/auth/profile', data)
    return response.data
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<ApiResponse> => {
    const response = await api.put('/auth/change-password', data)
    return response.data
  },
}

// Projects API
export const projectsApi = {
  getProjects: async (params?: {
    page?: number
    limit?: number
    status?: string
    priority?: string
    search?: string
  }): Promise<PaginatedResponse<Project>> => {
    const response = await api.get('/projects', { params })
    return response.data
  },

  getProject: async (id: string): Promise<ApiResponse<{ project: Project }>> => {
    const response = await api.get(`/projects/${id}`)
    return response.data
  },

  createProject: async (data: ProjectForm): Promise<ApiResponse<{ project: Project }>> => {
    const response = await api.post('/projects', data)
    return response.data
  },

  updateProject: async (id: string, data: Partial<ProjectForm>): Promise<ApiResponse<{ project: Project }>> => {
    const response = await api.put(`/projects/${id}`, data)
    return response.data
  },

  deleteProject: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/projects/${id}`)
    return response.data
  },
}

// Tasks API
export const tasksApi = {
  getTasks: async (params?: {
    page?: number
    limit?: number
    status?: string
    priority?: string
    projectId?: string
    search?: string
  }): Promise<PaginatedResponse<Task>> => {
    const response = await api.get('/tasks', { params })
    return response.data
  },

  getTask: async (id: string): Promise<ApiResponse<{ task: Task }>> => {
    const response = await api.get(`/tasks/${id}`)
    return response.data
  },

  createTask: async (data: TaskForm): Promise<ApiResponse<{ task: Task }>> => {
    const response = await api.post('/tasks', data)
    return response.data
  },

  updateTask: async (id: string, data: Partial<TaskForm>): Promise<ApiResponse<{ task: Task }>> => {
    const response = await api.put(`/tasks/${id}`, data)
    return response.data
  },

  deleteTask: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/tasks/${id}`)
    return response.data
  },
}

// Timesheets API
export const timesheetsApi = {
  getTimesheets: async (params?: {
    page?: number
    limit?: number
    status?: string
    startDate?: string
    endDate?: string
    projectId?: string
    taskId?: string
    userId?: string
  }): Promise<PaginatedResponse<Timesheet>> => {
    const response = await api.get('/timesheets', { params })
    return response.data
  },

  getTimesheetSummary: async (params?: {
    startDate?: string
    endDate?: string
    userId?: string
    projectId?: string
  }): Promise<ApiResponse<{
    summary: {
      totalHours: number
      billableHours: number
      nonBillableHours: number
      totalEntries: number
    }
    projectSummary: any[]
    userSummary: any[]
    timesheets: Timesheet[]
  }>> => {
    const response = await api.get('/timesheets/summary', { params })
    return response.data
  },

  createTimesheet: async (data: TimesheetForm): Promise<ApiResponse<{ timesheet: Timesheet }>> => {
    const response = await api.post('/timesheets', data)
    return response.data
  },

  updateTimesheet: async (id: string, data: Partial<TimesheetForm & { status?: string; rejectionReason?: string }>): Promise<ApiResponse<{ timesheet: Timesheet }>> => {
    const response = await api.put(`/timesheets/${id}`, data)
    return response.data
  },

  deleteTimesheet: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/timesheets/${id}`)
    return response.data
  },
}

// Reports API
export const reportsApi = {
  getDailyReport: async (date: string, format: 'json' | 'csv' | 'excel' | 'pdf' = 'json'): Promise<any> => {
    const response = await api.get(`/reports/daily?date=${date}&format=${format}`, {
      responseType: format === 'json' ? 'json' : 'blob'
    })
    return response.data
  },

  getWeeklyReport: async (startDate: string, format: 'json' | 'csv' | 'excel' | 'pdf' = 'json'): Promise<any> => {
    const response = await api.get(`/reports/weekly?startDate=${startDate}&format=${format}`, {
      responseType: format === 'json' ? 'json' : 'blob'
    })
    return response.data
  },

  getMonthlyReport: async (month: string, format: 'json' | 'csv' | 'excel' | 'pdf' = 'json'): Promise<any> => {
    const response = await api.get(`/reports/monthly?month=${month}&format=${format}`, {
      responseType: format === 'json' ? 'json' : 'blob'
    })
    return response.data
  },
}

// Users API
export const usersApi = {
  getUsers: async (params?: {
    page?: number
    limit?: number
    role?: string
    isActive?: boolean
    search?: string
  }): Promise<PaginatedResponse<User>> => {
    const response = await api.get('/users', { params })
    return response.data
  },

  getUser: async (id: string): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  updateUser: async (id: string, data: Partial<User>): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.put(`/users/${id}`, data)
    return response.data
  },

  deleteUser: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  },

  getUserTimesheets: async (id: string, params?: {
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Timesheet>> => {
    const response = await api.get(`/users/${id}/timesheets`, { params })
    return response.data
  },

  getUserStats: async (id: string, params?: {
    startDate?: string
    endDate?: string
  }): Promise<ApiResponse<{
    summary: {
      totalHours: number
      billableHours: number
      nonBillableHours: number
      totalEntries: number
    }
    projectStats: any[]
    statusStats: any
  }>> => {
    const response = await api.get(`/users/${id}/stats`, { params })
    return response.data
  },
}

export default api
