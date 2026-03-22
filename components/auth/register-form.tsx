'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { fioFieldsSchema, formatFullName } from '@/lib/fio'

const registerSchema = fioFieldsSchema.extend({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен быть минимум 6 символов'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterForm({
  showLoginLink = true,
}: {
  showLoginLink?: boolean
}) {
  const router = useRouter()
  const { register: registerUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    try {
      await registerUser({
        name: formatFullName(data),
        email: data.email,
        password: data.password,
      })
      toast.success('Регистрация прошла успешно')
      router.replace('/dashboard/profile')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка регистрации')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reg-lastName">Фамилия *</FieldLabel>
          <Input
            id="reg-lastName"
            type="text"
            placeholder="Соколова"
            autoComplete="family-name"
            {...register('lastName')}
            disabled={isLoading}
            className="bg-input border-border"
          />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </Field>
        <Field>
          <FieldLabel htmlFor="reg-firstName">Имя *</FieldLabel>
          <Input
            id="reg-firstName"
            type="text"
            placeholder="Мария"
            autoComplete="given-name"
            {...register('firstName')}
            disabled={isLoading}
            className="bg-input border-border"
          />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
        </Field>
        <Field>
          <FieldLabel htmlFor="reg-middleName">Отчество *</FieldLabel>
          <Input
            id="reg-middleName"
            type="text"
            placeholder="Ивановна"
            autoComplete="additional-name"
            {...register('middleName')}
            disabled={isLoading}
            className="bg-input border-border"
          />
          {errors.middleName && <p className="text-sm text-destructive">{errors.middleName.message}</p>}
        </Field>
        <Field>
          <FieldLabel htmlFor="reg-email">Email</FieldLabel>
          <Input
            id="reg-email"
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
          <FieldLabel htmlFor="reg-password">Пароль</FieldLabel>
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Минимум 6 символов"
              {...register('password')}
              disabled={isLoading}
              className="bg-input border-border pr-10"
              autoComplete="new-password"
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
        Зарегистрироваться
      </Button>

      {showLoginLink && (
        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{' '}
          <Link href="/auth?tab=login" className="text-primary hover:underline">
            Войти
          </Link>
        </p>
      )}
    </form>
  )
}
