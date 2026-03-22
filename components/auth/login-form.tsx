'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { useAuth } from '@/lib/contexts'
import type { User } from '@/lib/types'

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен быть минимум 6 символов'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

function resolvePostLoginPath(user: User, from: string | null): string {
  if (from && from.startsWith('/')) {
    if (from.startsWith('/dashboard')) return from
    if (from.startsWith('/admin') && user.role === 'admin') return from
  }
  return user.role === 'admin' ? '/admin' : '/dashboard'
}

export function LoginForm({
  showRegisterLink = true,
}: {
  showRegisterLink?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      const user = await login(data.email, data.password)
      toast.success('Вход выполнен успешно')
      const from = searchParams.get('from')
      const target = resolvePostLoginPath(user, from)
      if (typeof window !== 'undefined') {
        window.location.assign(target)
      } else {
        router.push(target)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка входа')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            placeholder="example@mail.com"
            {...register('email')}
            disabled={isLoading}
            className="bg-input border-border"
            autoComplete="email"
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </Field>
        <Field>
          <FieldLabel htmlFor="login-password">Пароль</FieldLabel>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Введите пароль"
              {...register('password')}
              disabled={isLoading}
              className="bg-input border-border pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              disabled={isLoading}
              onMouseDown={(e) => {
                e.preventDefault()
                setShowPassword(true)
              }}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              onTouchStart={() => setShowPassword(true)}
              onTouchEnd={() => setShowPassword(false)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  setShowPassword(true)
                }
              }}
              onKeyUp={() => setShowPassword(false)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </Field>
      </FieldGroup>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Войти
      </Button>

      {showRegisterLink && (
        <p className="text-center text-sm text-muted-foreground">
          Нет аккаунта?{' '}
          <Link href="/auth?tab=register" className="text-primary hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      )}
    </form>
  )
}
