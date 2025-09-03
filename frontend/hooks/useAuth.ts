"use client"

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ email?: string } | null>(null)

  useEffect(() => {
    const checkAuth = () => {
      const token = api.getToken()
      if (token) {
        setIsAuthenticated(true)
        // You could decode the JWT here to get user info
        // For now, we'll just set a basic user object
        setUser({ email: 'user@example.com' })
      } else {
        setIsAuthenticated(false)
        setUser(null)
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const result = await api.signin(email, password)
      setIsAuthenticated(true)
      setUser({ email })
      return result
    } catch (error) {
      setIsAuthenticated(false)
      setUser(null)
      throw error
    }
  }

  const logout = async () => {
    await api.logout()
    setIsAuthenticated(false)
    setUser(null)
  }

  const signup = async (email: string, password: string) => {
    try {
      const result = await api.signup(email, password)
      return result
    } catch (error) {
      throw error
    }
  }

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    signup
  }
}
