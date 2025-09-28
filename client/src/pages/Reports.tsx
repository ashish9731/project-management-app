import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { reportsApi } from '@/services/api'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/input'

const Reports = () => {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [isLoading, setIsLoading] = useState(false)

  const handleDownloadReport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsLoading(true)
    try {
      let response
      let filenamePrefix = 'report'

      if (reportType === 'daily') {
        response = await reportsApi.getDailyReport(date, format)
        filenamePrefix = `daily-report-${date}`
      } else if (reportType === 'weekly') {
        response = await reportsApi.getWeeklyReport(date, format)
        filenamePrefix = `weekly-report-from-${date}`
      } else {
        response = await reportsApi.getMonthlyReport(month, format)
        filenamePrefix = `monthly-report-${month}`
      }

      if (response) {
        const blob = new Blob([response], { type: getContentType(format) })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${filenamePrefix}.${format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        toast.success(`${reportType} report (${format.toUpperCase()}) downloaded successfully!`)
      } else {
        toast.error('Failed to generate report.')
      }
    } catch (error) {
      console.error('Error downloading report:', error)
      toast.error('Failed to download report.')
    } finally {
      setIsLoading(false)
    }
  }

  const getContentType = (format: string) => {
    switch (format) {
      case 'csv':
        return 'text/csv'
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      case 'pdf':
        return 'application/pdf'
      default:
        return 'application/octet-stream'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate and download activity and timesheet reports</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleDownloadReport('csv')}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            onClick={() => handleDownloadReport('excel')}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button 
            onClick={() => handleDownloadReport('pdf')}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Options</CardTitle>
          <CardDescription>Select report type and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium text-gray-700">Report Type</label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date / Week Start</label>
              {reportType !== 'monthly' ? (
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block w-full"
                />
              ) : (
                <Input
                  id="month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="mt-1 block w-full"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Reports
