// User types
export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'admin' | 'manager' | 'employee'
  isActive: boolean
  avatar?: string
  phone?: string
  department?: string
  position?: string
  createdAt: string
  fullName?: string
}

export interface AuthUser extends User {
  token: string
}

// Project types
export interface Project {
  id: string
  name: string
  description?: string
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  startDate?: string
  endDate?: string
  budget?: number
  color: string
  isArchived: boolean
  createdBy: string
  managerId?: string
  createdAt: string
  updatedAt: string
  creator?: User
  manager?: User
  tasks?: Task[]
  taskStats?: {
    total: number
    completed: number
    completionPercentage: number
  }
}

// Task types
export interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedHours?: number
  actualHours: number
  dueDate?: string
  completedAt?: string
  tags: string[]
  attachments: string[]
  projectId: string
  assignedTo?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  assignee?: User
  creator?: User
  project?: Project
  timesheets?: Timesheet[]
  timeStats?: {
    estimated: number
    logged: number
    progressPercentage: number
  }
}

// Timesheet types
export interface Timesheet {
  id: string
  date: string
  hours: number
  description?: string
  isBillable: boolean
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
  userId: string
  taskId: string
  projectId: string
  createdAt: string
  updatedAt: string
  user?: User
  approver?: User
  task?: Task
  project?: Project
}

// Report types
export interface ReportData {
  date?: string
  weekStart?: string
  weekEnd?: string
  month?: string
  monthStart?: string
  monthEnd?: string
  totalHours: number
  billableHours: number
  nonBillableHours: number
  totalEntries: number
  timesheets: Timesheet[]
  dailyData?: DailyData[]
  projectData?: ProjectData[]
  userData?: UserData[]
}

export interface DailyData {
  date: string
  totalHours: number
  billableHours: number
  entries: number
  timesheets: Timesheet[]
}

export interface ProjectData {
  project: Project
  totalHours: number
  billableHours: number
  entries: number
  timesheets: Timesheet[]
}

export interface UserData {
  user: User
  totalHours: number
  billableHours: number
  entries: number
  timesheets: Timesheet[]
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: any[]
}

export interface PaginatedResponse<T> {
  success: boolean
  data: {
    [key: string]: T[]
    pagination: {
      currentPage: number
      totalPages: number
      totalItems: number
      itemsPerPage: number
    }
  }
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  role?: 'admin' | 'manager' | 'employee'
}

export interface ProjectForm {
  name: string
  description?: string
  status?: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  startDate?: string
  endDate?: string
  budget?: number
  managerId?: string
  color?: string
}

export interface TaskForm {
  title: string
  description?: string
  status?: 'todo' | 'in-progress' | 'review' | 'done'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  projectId: string
  assignedTo?: string
  estimatedHours?: number
  dueDate?: string
  tags?: string[]
}

export interface TimesheetForm {
  date: string
  hours: number
  description?: string
  taskId: string
  projectId: string
  isBillable?: boolean
}

// Dashboard types
export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  totalHours: number
  billableHours: number
  totalUsers: number
  activeUsers: number
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string[]
    borderWidth?: number
  }[]
}
