"use client"

import type React from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import {
  BadgeCheck,
  BarChart3,
  Bell,
  CreditCard,
  Home,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Package,
  Phone,
  Plus,
  Settings,
  Shield,
  Truck,
  User,
  Users
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface LocalStorageUser {
  user: {
    id: number
    email: string
    full_name: string
    role: string
    phone: string
    profile_image?: string
  }
  token: string
}

const agentNavItems = [
  {
    group: "Main Menu",
    items: [
      { href: "/dashboard", icon: Home, label: "Dashboard" },
      { href: "/dashboard/packages", icon: Package, label: "Packages" },
    ]
  },
  {
    group: "Package Management",
    items: [
      { href: "/dashboard/packages/register", icon: Plus, label: "Register Package" },
      { href: "/track", icon: Truck, label: "Track Package" },
      { href: "/verify", icon: MapPin, label: "Verify Delivery" },
    ]
  }
]

const adminNavItems = [
  {
    group: "Main Menu",
    items: [
      { href: "/dashboard", icon: Home, label: "Dashboard" },
      { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
    ]
  },
  {
    group: "Package Management",
    items: [
      { href: "/dashboard/packages", icon: Package, label: "All Packages" },
      { href: "/dashboard/packages/register", icon: Plus, label: "Register Package" },
      { href: "/track", icon: Truck, label: "Track Package" },
    ]
  },
  {
    group: "Resource Management",
    items: [
      { href: "/dashboard/users", icon: Users, label: "User Management" },
      { href: "/dashboard/drivers", icon: User, label: "Drivers" },
      { href: "/dashboard/cars", icon: Truck, label: "Cars" },
      { href: "/dashboard/branches", icon: Home, label: "Branches" },
    ]
  },
  {
    group: "System",
    items: [
      { href: "/dashboard/payments", icon: CreditCard, label: "Payments" },
      { href: "/dashboard/notifications", icon: Bell, label: "Notifications" },
    ]
  }
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user: authUser, logout } = useAuth()
  const [localStorageUser, setLocalStorageUser] = useState<LocalStorageUser | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const userData = localStorage.getItem('kivu_belt_user')
    console.log('LocalStorage User Data:', userData) // Debug log
    if (userData) {
      try {
        const parsedData = JSON.parse(userData)
        console.log('Parsed User Data:', parsedData) // Debug log
        // Update: Handle direct user data structure (not nested under 'user')
        if (parsedData && parsedData.id && parsedData.email) {
          setLocalStorageUser({
            user: parsedData,
            token: localStorage.getItem('kivu_belt_token') || ''
          })
        } else {
          console.error('Invalid user data structure in localStorage')
          localStorage.removeItem('kivu_belt_user') // Clear invalid data
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error)
        localStorage.removeItem('kivu_belt_user') // Clear invalid data
      }
    }
  }, [])

  const user = localStorageUser?.user || authUser || null
  const navItems = user?.role === "admin" ? adminNavItems : agentNavItems

  const getInitials = (fullName: string) => {
    if (!fullName || typeof fullName !== 'string') return ''
    // Handle email addresses - use first two characters of the local part
    if (fullName.includes('@')) {
      return fullName.split('@')[0].slice(0, 2).toUpperCase()
    }
    // Handle regular names
    const names = fullName.trim().split(' ').filter(name => name.length > 0)
    if (names.length === 0) return ''
    return names.map(name => name.charAt(0)).join('').toUpperCase()
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/15 text-red-700 border-red-200'
      case 'agent':
        return 'bg-blue-500/15 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-500/15 text-gray-700 border-gray-200'
    }
  }

  const NavContent = () => (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      <div className="flex h-16 items-center border-b border-gray-200 px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white p-2.5 rounded-lg shadow-sm">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-gray-900">KIVU Belt</h1>
            <p className="text-sm text-gray-500 font-medium -mt-0.5">Express</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-3 py-4 space-y-3 overflow-y-auto">
        {navItems.map((section) => (
          <div key={section.group} className="space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {section.group}
            </p>
            {section.items.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 p-3 mt-auto shrink-0">
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50/80 border border-gray-100">
          <Avatar className="h-9 w-9 border border-gray-200">
            {user?.profile_image ? (
              <AvatarImage src={user.profile_image} alt={user.full_name || 'User'} />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-medium text-sm">
                {getInitials(user?.full_name || user?.email || '')}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.full_name || 'User'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
                getRoleBadgeColor(user?.role || '')
              )}>
                <Shield className="h-3 w-3 mr-1" />
                {user?.role || 'user'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const UserDropdown = () => {
    const [open, setOpen] = useState(false)

    // Debug helper to see what data we have
    useEffect(() => {
      console.log('Current User Data:', {
        localStorageUser,
        authUser,
        user,
        initials: user ? getInitials(user.full_name || user.email || '') : ''
      })
    }, [user])

    if (!user) {
      return null // Don't render the dropdown if there's no user data
    }

    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger className="outline-none">
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full border border-gray-200"
          >
            <Avatar className="h-7 w-7">
              {user.profile_image ? (
                <AvatarImage src={user.profile_image} alt={user.full_name || 'User'} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-500 text-white text-xs">
                  {getInitials(user.full_name || user.email || '')}
                </AvatarFallback>
              )}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" align="end" sideOffset={8}>
          <DropdownMenuLabel className="font-normal p-0">
            <div className="relative p-4 border-b">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50" />
              <div className="relative flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-500 text-white text-sm font-semibold">
                    {getInitials(user?.full_name || user?.email || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {user?.full_name || 'User'}
                    </h3>
                    <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  </div>

                  <div className="space-y-1 mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <span className="break-all">{user?.email || 'No email'}</span>
                    </div>

                    {user?.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        <span>{user.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="relative flex h-2 w-2 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border",
                        getRoleBadgeColor(user?.role || '')
                      )}>
                        <Shield className="h-3 w-3" />
                        {user?.role?.toUpperCase() || 'USER'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>

          <div className="p-2">
            <DropdownMenuItem asChild>
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-md"
              >
                <User className="h-4 w-4 text-gray-500" />
                Profile Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded-md"
              >
                <Settings className="h-4 w-4 text-gray-500" />
                Account Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              onClick={() => {
                setOpen(false)
                logout()
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const ProfessionalFooter = () => (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white p-1.5 rounded">
              <Truck className="h-4 w-4" />
            </div>
            <span className="font-semibold text-gray-900">KIVU Belt Express</span>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">
              Terms of Service
            </Link>
            <Link href="/support" className="hover:text-blue-600 transition-colors">
              Support
            </Link>
            <Link href="/contact" className="hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </div>

          <div className="mt-4 md:mt-0 text-xs text-gray-500">
            © {new Date().getFullYear()} KIVU Belt Express. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar for desktop - Fixed and non-scrollable */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-40 border-r border-gray-200 bg-white">
        <NavContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="lg:hidden fixed top-4 left-4 z-50 bg-white border shadow-sm">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:ml-64 min-h-0">
        <header className="h-16 border-b bg-white sticky top-0 z-30 flex items-center px-6 shrink-0">
          <div className="flex-1 flex items-center gap-4">
            <div className="lg:hidden">
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="border">
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {navItems.flatMap(section => section.items).find(item => item.href === pathname)?.label || "Dashboard"}
              </h2>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.full_name || user?.fullName || 'User'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button variant="ghost" size="sm" className="relative h-9 w-9 border">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border border-white"></span>
            </Button>

            <UserDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>

        <ProfessionalFooter />
      </div>
    </div>
  )
}