'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { login as apiLogin, getCurrentUser, logout as apiLogout } from '@/lib/api/auth'
import type { LoginInput } from '@/types/auth'
import { useRouter } from 'next/navigation'
import { clientLogger } from '@/lib/logging/client'

export function useAuth() {
  const queryClient = useQueryClient()
  const router = useRouter()

  // Fetch user data - this is the single source of truth for auth state
  const userQuery = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => getCurrentUser(),
    retry: false,
    staleTime: Infinity, // Don't refetch user data automatically
  })

  const user = userQuery.data ?? null
  const isAuthenticated = !!user
  const isLoadingUser = userQuery.isLoading

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const formData = new FormData()
      formData.append('username', credentials.username)
      formData.append('password', credentials.password)
      formData.append('recaptchaToken', credentials.recaptchaToken)

      const result = await apiLogin(formData)
      if (result.error) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: async () => {
      // Invalidate and refetch user data
      await queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
      // Check for redirect parameter in URL
      const params = new URLSearchParams(window.location.search)
      const redirectUrl = params.get('redirect') || '/dashboard'
      router.push(redirectUrl)
    },
    onError: (error: Error) => {
      clientLogger.error('Login error:', error)
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiLogout()
    },
    onSuccess: () => {
      // Clear all queries and reset to unauthenticated state
      queryClient.clear()
      router.push('/login')
    },
  })

  return {
    user,
    isAuthenticated,
    isLoading: isLoadingUser || loginMutation.isPending,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    loginError: loginMutation.error,
    isLoginPending: loginMutation.isPending,
  }
}
