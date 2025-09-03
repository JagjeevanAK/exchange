"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (token) {
      // Store the token and redirect to dashboard
      localStorage.setItem('token', token)
      router.push('/desk')
    } else if (error) {
      // Handle authentication error
      console.error('Authentication error:', error)
      router.push('/signin?error=' + error)
    } else {
      // No token or error, redirect to signin
      router.push('/signin')
    }
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-lg">Processing authentication...</p>
      </div>
    </div>
  )
}
