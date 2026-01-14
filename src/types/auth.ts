import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  recaptchaToken: z.string().min(1, 'Please complete the reCAPTCHA'),
})

export type LoginInput = z.infer<typeof loginSchema>

export interface AuthTokens {
  access: string
  refresh: string
}

export interface User {
  id: string
  username: string
  email: string | null
  firstName: string | null
  lastName: string | null
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
