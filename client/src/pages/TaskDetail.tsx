import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const TaskDetail = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Task Details</h1>
        <p className="text-gray-600">View and manage task information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Detail</CardTitle>
          <CardDescription>Detailed task view</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Task detail page is under development.</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default TaskDetail
