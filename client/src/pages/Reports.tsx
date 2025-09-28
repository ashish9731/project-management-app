import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

const Reports = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate and download reports</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Generate comprehensive reports</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Reports page is under development. This will include:</p>
          <ul className="mt-2 list-disc list-inside text-gray-500 space-y-1">
            <li>Daily, weekly, and monthly reports</li>
            <li>Project and task summaries</li>
            <li>Time tracking analytics</li>
            <li>Export to CSV, Excel, and PDF</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default Reports
