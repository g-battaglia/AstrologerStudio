'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import LoginForm from '@/app/login/LoginForm'
import RegisterForm from '@/app/register/RegisterForm'

interface AuthPageProps {
  defaultTab?: 'login' | 'register'
}

export function AuthPage({ defaultTab = 'register' }: AuthPageProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{ backgroundImage: 'url(/auth.webp)' }}
      />
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-background/60" />

      {/* Glassmorphism Card */}
      <Card className="relative z-10 w-full max-w-md border-white/20 bg-background/70 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex justify-center">
            <span className="brand-heading whitespace-nowrap text-xl font-medium">Astrologer Studio</span>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="register">Create Account</TabsTrigger>
              <TabsTrigger value="login">Login</TabsTrigger>
            </TabsList>
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
