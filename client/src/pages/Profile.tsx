import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const Profile = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Profile page is under development.</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Profile
