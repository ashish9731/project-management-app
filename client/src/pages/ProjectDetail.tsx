import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const ProjectDetail = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Project Details</h1>
        <p className="text-gray-600">View and manage project information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Detail</CardTitle>
          <CardDescription>Detailed project view</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Project detail page is under development.</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProjectDetail
