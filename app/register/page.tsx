import { RegisterForm } from "@/components/auth/register-form"
import { Button } from "@/components/ui/button"
import { Truck, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back to Login */}
        <div className="flex items-center">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>

        {/* Logo and Brand */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg">
              <Truck className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">KIVU Belt Express</h1>
          <p className="text-muted-foreground">Join our courier team</p>
        </div>

        {/* Register Form */}
        <RegisterForm />

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>&copy; 2024 KIVU Belt Express. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
