// components/auth/user-dropdown.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { BadgeCheck, LogOut, Mail, Phone, Settings, Shield, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserDropdownProps {
  user: any
  logout: () => void
  getInitials: (name: string) => string
  getRoleBadgeColor: (role: string) => string
  isLoading: boolean
}

export const UserDropdown = ({ user, logout, getInitials, getRoleBadgeColor, isLoading }: UserDropdownProps) => {
  const [open, setOpen] = useState(false)

  // Optional: Keep debug log if needed, but typically remove for production
  useEffect(() => {
    // console.log('UserDropdown - Current User Data:', user)
    // console.log('UserDropdown - Is Loading:', isLoading)
  }, [user, isLoading])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full border border-gray-200 hover:border-gray-300 hover:shadow-sm"
          style={{
            willChange: 'transform',
            transition: 'transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
            transform: open ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <Avatar className="h-7 w-7 will-change-transform">
            {isLoading ? (
              <AvatarFallback className="bg-gray-200 animate-pulse" />
            ) : user?.profile_image ? (
              <AvatarImage
                src={user.profile_image}
                alt={user.full_name || 'User'}
                style={{ willChange: 'opacity' }}
              />
            ) : (
              <AvatarFallback
                className="bg-gradient-to-br from-blue-600 to-blue-500 text-white text-xs font-medium"
                style={{ willChange: 'transform' }}
              >
                {getInitials(user?.full_name || user?.email || '')}
              </AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-72 will-change-[transform,opacity]"
        align="end"
        sideOffset={8}
        style={{
          transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)',
        }}
      >
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading user data...</div>
        ) : user ? (
          <>
            <DropdownMenuLabel className="font-normal p-0">
              <div className="relative p-4 border-b">
                <div
                  className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50"
                  style={{ willChange: 'opacity' }}
                />
                <div className="relative flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                    {user.profile_image ? (
                      <AvatarImage src={user.profile_image} alt={user.full_name || 'User'} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-500 text-white text-sm font-semibold">
                        {getInitials(user.full_name || user.email || '')}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {user.full_name || 'User'}
                      </h3>
                      <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    </div>

                    <div className="space-y-1 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        <span className="break-all">{user.email || 'No email'}</span>
                      </div>

                      {user.phone && (
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
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border",
                            getRoleBadgeColor(user.role || '')
                          )}
                        >
                          <Shield className="h-3 w-3" />
                          {user.role?.toUpperCase() || 'USER'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>

            <div className="p-2 space-y-1">
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <User className="h-4 w-4 text-gray-500" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => setOpen(false)}
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
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-gray-500">No user data available.</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}



