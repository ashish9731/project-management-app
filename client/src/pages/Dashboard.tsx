import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FolderOpen, 
  CheckSquare, 
  Clock, 
  Users, 
  TrendingUp,
  Calendar,
  Loader2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { projectsApi, tasksApi, timesheetsApi, usersApi } from '@/services/api'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  totalHours: number
  billableHours: number
  totalUsers: number
  activeUsers: number
}

interface RecentProject {
  id: string
  name: string
  status: string
  progress: number
}

interface RecentTask {
  id: string
  title: string
  project: string
  status: string
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalHours: 0,
    billableHours: 0,
    totalUsers: 0,
    activeUsers: 0,
  })
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch projects
        const projectsResponse = await projectsApi.getProjects({ limit: 100 })
        const projects = projectsResponse.data.projects || []
        
        // Fetch tasks
        const tasksResponse = await tasksApi.getTasks({ limit: 100 })
        const tasks = tasksResponse.data.tasks || []
        
        // Fetch timesheet summary
        const timesheetResponse = await timesheetsApi.getTimesheetSummary()
        const timesheetData = timesheetResponse.data?.summary || {
          totalHours: 0,
          billableHours: 0,
          totalEntries: 0
        }
        
        // Fetch users (only if admin/manager)
        let usersData = { totalUsers: 0, activeUsers: 0 }
        // Since authentication is removed, we'll fetch all users if needed for stats
        try {
          const usersResponse = await usersApi.getUsers({ limit: 100 })
          const users = usersResponse.data.users || []
          usersData = {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.isActive).length
          }
        } catch (error) {
          console.log('Users data not accessible or no users endpoint')
        }

        // Calculate stats
        const activeProjects = projects.filter(p => p.status === 'active').length
        const completedTasks = tasks.filter(t => t.status === 'done').length
        
        setStats({
          totalProjects: projects.length,
          activeProjects,
          totalTasks: tasks.length,
          completedTasks,
          totalHours: timesheetData.totalHours,
          billableHours: timesheetData.billableHours,
          ...usersData
        })

        // Set recent projects (limit to 3)
        const recentProjectsData = projects.slice(0, 3).map(project => ({
          id: project.id,
          name: project.name,
          status: project.status,
          progress: project.taskStats?.completionPercentage || 0
        }))
        setRecentProjects(recentProjectsData)

        // Set recent tasks (limit to 3)
        const recentTasksData = tasks.slice(0, 3).map(task => ({
          id: task.id,
          title: task.title,
          project: task.project?.name || 'No Project',
          status: task.status
        }))
        setRecentTasks(recentTasksData)

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        toast.error('Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, []) // Removed user from dependency array

  const statCards = [
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      description: `${stats.activeProjects} active`,
      icon: FolderOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      link: '/projects',
    },
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      description: `${stats.completedTasks} completed`,
      icon: CheckSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      link: '/tasks',
    },
    {
      title: 'Hours Logged',
      value: `${stats.totalHours}h`,
      description: `${stats.billableHours}h billable`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/timesheets',
    },
    {
      title: 'Team Members',
      value: stats.totalUsers,
      description: `${stats.activeUsers} active`,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      link: '/users',
    },
  ]

  const quickActions = [
    {
      title: 'Create Project',
      description: 'Start a new project',
      icon: FolderOpen,
      link: '/projects',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Add Task',
      description: 'Create a new task',
      icon: CheckSquare,
      link: '/tasks',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Log Time',
      description: 'Record work hours',
      icon: Clock,
      link: '/timesheets',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'View Reports',
      description: 'Generate reports',
      icon: TrendingUp,
      link: '/reports',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back!</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back!</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link key={index} to={action.link}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${action.bgColor}`}>
                      <action.icon className={`h-6 w-6 ${action.color}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{action.title}</h3>
                      <p className="text-sm text-gray-500">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your latest project updates</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{project.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{project.progress}%</p>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No projects found</p>
            )}
            <div className="mt-4">
              <Link to="/projects">
                <Button variant="outline" className="w-full">
                  View All Projects
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Your latest task assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentTasks.length > 0 ? (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{task.title}</p>
                      <p className="text-sm text-gray-500">{task.project}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.status === 'done' ? 'bg-green-100 text-green-800' :
                      task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No tasks found</p>
            )}
            <div className="mt-4">
              <Link to="/tasks">
                <Button variant="outline" className="w-full">
                  View All Tasks
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
