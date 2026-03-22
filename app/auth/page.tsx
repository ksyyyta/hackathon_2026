'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { Spinner } from '@/components/ui/spinner'
import { ThemeToggle } from '@/components/theme-toggle'

function AuthTabs() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  useEffect(() => {
    const mode = searchParams.get('tab')
    if (mode === 'register') setTab('register')
    if (mode === 'login') setTab('login')
  }, [searchParams])

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="login">Вход</TabsTrigger>
        <TabsTrigger value="register">Регистрация</TabsTrigger>
      </TabsList>
      <TabsContent value="login" className="mt-0">
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          }
        >
          <LoginForm showRegisterLink={false} />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Нет аккаунта?{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setTab('register')}
          >
            Зарегистрироваться
          </button>
        </p>
      </TabsContent>
      <TabsContent value="register" className="mt-0">
        <RegisterForm showLoginLink={false} />
        <p className="text-center text-sm text-muted-foreground mt-4">
          Уже есть аккаунт?{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setTab('login')}
          >
            Войти
          </button>
        </p>
      </TabsContent>
    </Tabs>
  )
}

export default function AuthPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <Button variant="ghost" size="sm" className="mb-4 self-start sm:absolute sm:top-4 sm:left-4" asChild>
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          На главную
        </Link>
      </Button>
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image
              src="/logo.jpeg"
              alt="Titan IT"
              width={64}
              height={64}
              className="rounded-xl"
            />
          </div>
          <CardTitle className="text-2xl text-card-foreground">
            <span>TITAN</span>
            <span className="text-primary">IT</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Вход или регистрация психолога
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            }
          >
            <AuthTabs />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
