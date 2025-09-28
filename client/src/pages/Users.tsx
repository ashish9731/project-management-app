import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

const Users = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage team members and permissions</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Team member management</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Users page is under development. This will include:</p>
          <ul className="mt-2 list-disc list-inside text-gray-500 space-y-1">
            <li>User creation and management</li>
            <li>Role-based access control</li>
            <li>Permission management</li>
            <li>User activity tracking</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default Users
