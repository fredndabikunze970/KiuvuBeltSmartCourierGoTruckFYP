"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, MapPin } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface Branch {
  id: number
  name: string
  location: string
}

export default function SelectBranchPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect if not agent or already has branch
    if (user && user.role !== 'agent') {
      router.push('/dashboard')
      return
    }
    if (user && user.branch_id) {
      router.push('/dashboard')
      return
    }

    fetchBranches()
  }, [user, router])

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches')
      if (!response.ok) throw new Error('Failed to fetch branches')
      const data = await response.json()
      setBranches(data.data || [])
    } catch (err) {
      setError('Failed to load branches')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedBranchId) {
      setError('Please select a branch')
      return
    }

    setSaving(true)
    setError("")

    try {
      const response = await fetch('/api/auth/update-branch', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('kivu_belt_token')}`
        },
        body: JSON.stringify({ branch_id: parseInt(selectedBranchId) })
      })

      if (!response.ok) throw new Error('Failed to update branch')

      // Update localStorage user data
      const userData = JSON.parse(localStorage.getItem('kivu_belt_user') || '{}')
      userData.branch_id = selectedBranchId
      localStorage.setItem('kivu_belt_user', JSON.stringify(userData))

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branch')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-50 text-blue-600 p-3 rounded-full w-fit mb-4">
            <MapPin className="h-6 w-6" />
          </div>
          <CardTitle>Select Your Branch</CardTitle>
          <CardDescription>
            Please select the branch you are assigned to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Branch</label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select your branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name} - {branch.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={saving || !selectedBranchId}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Continue to Dashboard"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
