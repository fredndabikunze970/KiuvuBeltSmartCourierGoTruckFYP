"use client"

import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"

interface UserData {
  id?: string
  full_name?: string
  email?: string
  phone?: string
  role?: string
}

export function useUserData() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const auth = useAuth()

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true)
      try {
        // Try to get user data from localStorage first
        const storedData = localStorage.getItem('kivu_belt_user')
        if (storedData) {
          setUser(JSON.parse(storedData))
        } else if (auth.user) {
          // If not in localStorage, use auth user data
          const userData = {
            id: auth.user.id,
            full_name: auth.user.full_name || auth.user.fullName,
            email: auth.user.email,
            role: auth.user.role,
            phone: auth.user.phone || undefined
          }
          // Store in localStorage for future use
          localStorage.setItem('kivu_belt_user', JSON.stringify(userData))
          setUser(userData)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [auth.user])

  return { user, isLoading }
}