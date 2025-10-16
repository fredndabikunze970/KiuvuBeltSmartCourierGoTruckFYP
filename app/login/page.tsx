import { LoginForm } from "@/components/auth/login-form"
import { Truck } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Brand */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg">
              <Truck className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Kivu Belt Express
          </h1>
          <p className="text-muted-foreground">Smart Courier Trucking System</p>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>&copy; 2025 KIVU Belt Express. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
