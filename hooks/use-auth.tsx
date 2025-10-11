"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  BadgeCheck, Bell, Calendar, LayoutDashboard, LineChart, LogOut, Mail, MessageSquare,
  Package, Phone, Settings, Shield, Truck, User, Users
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createContext, useContext, useEffect, useState } from "react"

interface User {
  id: number
  email: string
  full_name: string
  role: string
  phone?: string
  branch_id?: string
}

// Add the missing AuthContextType interface
interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; full_name: string; phone: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const adminNavItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard/analytics',
      label: 'Analytics',
      icon: LineChart,
    },
    {
      href: '/dashboard/packages',
      label: 'All Packages',
      icon: Package,
    },
    {
      href: '/dashboard/deliveries',
      label: 'Track Deliveries',
      icon: Truck,
    },
    {
      href: '/dashboard/notifications',
      label: 'Notifications',
      icon: Bell,
    },
    {
      href: '/dashboard/users',
      label: 'User Management',
      icon: Users,
    },
    {
      href: '/dashboard/sms',
      label: 'SMS Settings',
      icon: MessageSquare,
    }
  ]

  const agentNavItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard/analytics',
      label: 'Analytics',
      icon: LineChart,
    },
    {
      href: '/dashboard/packages',
      label: 'My Packages',
      icon: Package,
    },
    {
      href: '/dashboard/deliveries',
      label: 'My Deliveries',
      icon: Truck,
    },
    {
      href: '/dashboard/notifications',
      label: 'Notifications',
      icon: Bell,
    }
  ]

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Single useEffect for checking authentication
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = () => {
    try {
      // Check for both token and user data in localStorage
      const token = localStorage.getItem('kivu_belt_token')
      const userData = localStorage.getItem('kivu_belt_user')
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setIsAuthenticated(true)
        console.log('User authenticated from localStorage:', parsedUser)
      } else {
        console.log('No authentication data found in localStorage')
        setUser(null)
        setIsAuthenticated(false)
        
        // Clear any invalid data
        localStorage.removeItem('kivu_belt_token')
        localStorage.removeItem('kivu_belt_user')
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setUser(null)
      setIsAuthenticated(false)
      
      // Clear corrupted data
      localStorage.removeItem('kivu_belt_token')
      localStorage.removeItem('kivu_belt_user')
    } finally {
      setLoading(false)
    }
  }

  const navItems = user?.role === "admin" ? adminNavItems : agentNavItems

  const getInitials = (fullName: string) => {
    return fullName
      ?.split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase() || 'U'
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/15 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
      case 'agent':
        return 'bg-blue-500/15 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
      default:
        return 'bg-gray-500/15 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20'
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.log('Attempting login for:', email)
      
      // Call your login API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      console.log('Login API response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Your API returns { success, token, user }
      const { token, user: userData } = data

      if (!token || !userData) {
        throw new Error('Invalid response from server: missing token or user data')
      }

      // Store both token and user data in localStorage
      localStorage.setItem('kivu_belt_token', token)
      localStorage.setItem('kivu_belt_user', JSON.stringify(userData))
      
      console.log('Stored in localStorage:', {
        token: localStorage.getItem('kivu_belt_token')?.substring(0, 20) + '...',
        user: localStorage.getItem('kivu_belt_user')
      })

      // Update state
      setUser(userData)
      setIsAuthenticated(true)

      console.log('Login successful, checking redirect...')
      if (userData.role === 'agent' && !userData.branch_id) {
        router.push('/select-branch')
      } else {
        router.push('/dashboard')
      }
      
    } catch (error) {
      console.error('Login error:', error)
      
      // Clear any partial data on error
      localStorage.removeItem('kivu_belt_token')
      localStorage.removeItem('kivu_belt_user')
      setUser(null)
      setIsAuthenticated(false)
      
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (data: { email: string; password: string; full_name: string; phone: string }) => {
    try {
      setLoading(true)
      console.log('Attempting registration for:', data.email)

      // Call your registration API endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const responseData = await response.json()
      console.log('Registration API response:', responseData)

      if (!response.ok) {
        throw new Error(responseData.error || 'Registration failed')
      }

      // Your API should return { success, token, user } for registration too
      const { token, user: userData } = responseData

      if (!token || !userData) {
        throw new Error('Invalid response from server: missing token or user data')
      }

      // Store both token and user data in localStorage
      localStorage.setItem('kivu_belt_token', token)
      localStorage.setItem('kivu_belt_user', JSON.stringify(userData))
      
      console.log('Stored in localStorage:', {
        token: localStorage.getItem('kivu_belt_token')?.substring(0, 20) + '...',
        user: localStorage.getItem('kivu_belt_user')
      })

      // Update state
      setUser(userData)
      setIsAuthenticated(true)
      
      console.log('Registration successful, redirecting to dashboard...')
      router.push('/dashboard')
      
    } catch (error) {
      console.error('Registration error:', error)
      
      // Clear any partial data on error
      localStorage.removeItem('kivu_belt_token')
      localStorage.removeItem('kivu_belt_user')
      setUser(null)
      setIsAuthenticated(false)
      
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    console.log('Logging out user...')
    
    // Clear localStorage
    localStorage.removeItem('kivu_belt_token')
    localStorage.removeItem('kivu_belt_user')
    
    // Clear state
    setUser(null)
    setIsAuthenticated(false)
    
    console.log('User logged out, redirecting to login...')
    router.push('/login')
  }

  const UserDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-2 border-gray-200 dark:border-gray-600"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-semibold text-sm">
              {getInitials(user?.full_name || '')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-0">
          <div className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-blue-500/30 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-500 text-white text-xl font-semibold">
                  {getInitials(user?.full_name || '')}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {user?.full_name || 'User'}
                  </h3>
                  <BadgeCheck className="h-4 w-4 text-blue-500" />
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{user?.email || 'No email'}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Phone className="h-4 w-4" />
                  <span>{user?.phone || 'No phone'}</span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border",
                    getRoleBadgeColor(user?.role || '')
                  )}>
                    <Shield className="h-3 w-3 mr-1" />
                    {user?.role?.toUpperCase() || 'USER'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-600 px-2 py-1 text-xs text-gray-600 dark:text-gray-300">
                    <Calendar className="h-3 w-3 mr-1" />
                    ID: {user?.id}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup className="p-2">
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-3">
            <Link href="/dashboard/profile" className="flex items-center w-full">
              <User className="mr-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <span className="font-medium text-gray-900 dark:text-white">Profile Settings</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manage your personal information</p>
              </div>
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-3">
            <Link href="/dashboard/settings" className="flex items-center w-full">
              <Settings className="mr-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <span className="font-medium text-gray-900 dark:text-white">Account Settings</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Preferences and configuration</p>
              </div>
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={logout} 
          className="cursor-pointer rounded-lg py-3 text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-500/10"
        >
          <LogOut className="mr-3 h-4 w-4" />
          <div className="flex-1">
            <span className="font-medium">Sign Out</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">Log out of your account</p>
          </div>
          <DropdownMenuShortcut>⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}