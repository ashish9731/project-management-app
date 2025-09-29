import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Calendar, Clock, User, Loader2, Download } from 'lucide-react'
import { timesheetsApi, tasksApi, projectsApi } from '@/services/api'
import { Timesheet, Task, Project } from '@/types'
import { formatDate, getStatusColor } from '@/lib/utils'
import toast from 'react-hot-toast'

const Timesheets = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    fetchTimesheets()
    fetchTasks()
    fetchProjects()
  }, [searchTerm, statusFilter, projectFilter, dateFilter])

  const fetchTimesheets = async () => {
    try {
      setIsLoading(true)
      const params: any = { limit: 100 }
      
      if (statusFilter) params.status = statusFilter
      if (projectFilter) params.projectId = projectFilter
      if (dateFilter) {
        const startDate = new Date(dateFilter)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 7) // Get week
        params.startDate = startDate.toISOString().split('T')[0]
        params.endDate = endDate.toISOString().split('T')[0]
      }

      const response = await timesheetsApi.getTimesheets(params)
      let timesheetData = response.data.timesheets || []
      
      // Client-side search filtering
      if (searchTerm) {
        timesheetData = timesheetData.filter(ts => 
          ts.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ts.task?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ts.project?.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }
      
      setTimesheets(timesheetData)
    } catch (error) {
      console.error('Error fetching timesheets:', error)
      toast.error('Failed to load timesheets')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await tasksApi.getTasks({ limit: 100 })
      setTasks(response.data.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await projectsApi.getProjects({ limit: 100 })
      setProjects(response.data.projects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const handleDeleteTimesheet = async (timesheetId: string) => {
    if (!window.confirm('Are you sure you want to delete this timesheet entry?')) return
    
    try {
      await timesheetsApi.deleteTimesheet(timesheetId)
      toast.success('Timesheet entry deleted successfully')
      fetchTimesheets()
    } catch (error) {
      console.error('Error deleting timesheet:', error)
      toast.error('Failed to delete timesheet entry')
    }
  }

  const handleStatusChange = async (timesheetId: string, newStatus: string) => {
    try {
      await timesheetsApi.updateTimesheet(timesheetId, { status: newStatus })
      toast.success('Timesheet status updated')
      fetchTimesheets()
    } catch (error) {
      console.error('Error updating timesheet:', error)
      toast.error('Failed to update timesheet status')
    }
  }

  const exportTimesheets = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await timesheetsApi.getTimesheetSummary({
        startDate: dateFilter || today,
        endDate: dateFilter || today
      })
      
      // Create and download file based on format
      if (format === 'csv') {
        const csvData = generateCSV(response.data.timesheets)
        downloadFile(csvData, `timesheets-${dateFilter || today}.csv`, 'text/csv')
      } else {
        toast.info(`${format.toUpperCase()} export coming soon!`)
      }
    } catch (error) {
      console.error('Error exporting timesheets:', error)
      toast.error('Failed to export timesheets')
    }
  }

  const generateCSV = (timesheets: Timesheet[]) => {
    const headers = ['Date', 'User', 'Project', 'Task', 'Hours', 'Billable', 'Status', 'Description']
    const rows = timesheets.map(ts => [
      ts.date,
      ts.user?.fullName || '',
      ts.project?.name || '',
      ts.task?.title || '',
      ts.hours,
      ts.isBillable ? 'Yes' : 'No',
      ts.status,
      ts.description || ''
    ])
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  }

  const downloadFile = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const totalHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.hours.toString()), 0)
  const billableHours = timesheets.filter(ts => ts.isBillable).reduce((sum, ts) => sum + parseFloat(ts.hours.toString()), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
          <p className="text-gray-600">Track your work hours and time entries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportTimesheets('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Log Time
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Billable Hours</p>
                <p className="text-2xl font-bold text-gray-900">{billableHours.toFixed(1)}h</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">{timesheets.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <User className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search timesheets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timesheets List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : timesheets.length > 0 ? (
        <div className="space-y-4">
          {timesheets.map((timesheet) => (
            <Card key={timesheet.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {timesheet.task?.title || 'No Task'}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(timesheet.status)}`}>
                            {timesheet.status}
                          </span>
                          {timesheet.isBillable && (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              Billable
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(timesheet.date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{timesheet.hours}h</span>
                          </div>
                          {timesheet.project && (
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: timesheet.project.color }}
                              ></div>
                              <span>{timesheet.project.name}</span>
                            </div>
                          )}
                        </div>
                        
                        {timesheet.description && (
                          <p className="text-gray-600 text-sm">{timesheet.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{timesheet.hours}h</p>
                        <p className="text-xs text-gray-500">
                          {timesheet.isBillable ? 'Billable' : 'Non-billable'}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        {(user?.role === 'admin' || user?.role === 'manager') && timesheet.status === 'submitted' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(timesheet.id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleStatusChange(timesheet.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {(user?.role === 'admin' || user?.role === 'manager' || timesheet.userId === user?.id) && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTimesheet(timesheet.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">
              <div className="text-6xl mb-4">⏰</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No timesheets found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter || projectFilter || dateFilter
                  ? 'Try adjusting your search criteria'
                  : 'Get started by logging your first time entry'
                }
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Log Time
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Timesheets
