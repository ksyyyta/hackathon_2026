'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Image as ImageIcon, Loader2, Trash2, Upload, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/contexts'
import { api } from '@/lib/api'
import { fioFieldsSchema, formatFullName, parseFullName } from '@/lib/fio'

const MAX_AVATAR_BYTES = 800_000

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function makeAvatarDataUrl(opts: { bg1: string; bg2: string; accent: string; glyph: string }): string {
  const { bg1, bg2, accent, glyph } = opts
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${bg1}"/>
        <stop offset="1" stop-color="${bg2}"/>
      </linearGradient>
      <radialGradient id="r" cx="35%" cy="30%" r="70%">
        <stop offset="0" stop-color="${accent}" stop-opacity="0.55"/>
        <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#g)"/>
    <circle cx="48" cy="40" r="42" fill="url(#r)"/>
    <circle cx="88" cy="92" r="30" fill="${accent}" stop-opacity="0.18"/>
    <g fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="2">
      <path d="M28 70c10-16 23-24 39-24s29 8 33 22" stroke-linecap="round"/>
      <path d="M34 88c14-10 28-14 44-12" stroke-linecap="round" opacity="0.8"/>
    </g>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
      font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="44"
      fill="#fff" font-weight="700" letter-spacing="1">
      ${glyph}
    </text>
  </svg>`
  return svgToDataUrl(svg)
}

const suggestedAvatars = [
  { id: 's1', dataUrl: makeAvatarDataUrl({ bg1: '#4F46E5', bg2: '#06B6D4', accent: '#22C55E', glyph: 'P' }) },
  { id: 's2', dataUrl: makeAvatarDataUrl({ bg1: '#7C3AED', bg2: '#F97316', accent: '#60A5FA', glyph: 'S' }) },
  { id: 's3', dataUrl: makeAvatarDataUrl({ bg1: '#0EA5E9', bg2: '#22C55E', accent: '#A78BFA', glyph: 'T' }) },
  { id: 's4', dataUrl: makeAvatarDataUrl({ bg1: '#EF4444', bg2: '#F59E0B', accent: '#93C5FD', glyph: 'I' }) },
  { id: 's5', dataUrl: makeAvatarDataUrl({ bg1: '#14B8A6', bg2: '#6366F1', accent: '#FCA5A5', glyph: 'N' }) },
  { id: 's6', dataUrl: makeAvatarDataUrl({ bg1: '#8B5CF6', bg2: '#EC4899', accent: '#34D399', glyph: 'D' }) },
  { id: 's7', dataUrl: makeAvatarDataUrl({ bg1: '#22C55E', bg2: '#0EA5E9', accent: '#FBBF24', glyph: 'A' }) },
  { id: 's8', dataUrl: makeAvatarDataUrl({ bg1: '#F97316', bg2: '#DC2626', accent: '#60A5FA', glyph: 'G' }) },
]

const galleryAvatars = [
  { id: 'g1', dataUrl: makeAvatarDataUrl({ bg1: '#0F766E', bg2: '#22C55E', accent: '#93C5FD', glyph: '1' }) },
  { id: 'g2', dataUrl: makeAvatarDataUrl({ bg1: '#2563EB', bg2: '#A78BFA', accent: '#FDE68A', glyph: '2' }) },
  { id: 'g3', dataUrl: makeAvatarDataUrl({ bg1: '#DB2777', bg2: '#F59E0B', accent: '#93C5FD', glyph: '3' }) },
  { id: 'g4', dataUrl: makeAvatarDataUrl({ bg1: '#4B5563', bg2: '#22C55E', accent: '#FCA5A5', glyph: '4' }) },
  { id: 'g5', dataUrl: makeAvatarDataUrl({ bg1: '#7C2D12', bg2: '#F97316', accent: '#60A5FA', glyph: '5' }) },
  { id: 'g6', dataUrl: makeAvatarDataUrl({ bg1: '#1D4ED8', bg2: '#0EA5E9', accent: '#F9A8D4', glyph: '6' }) },
  { id: 'g7', dataUrl: makeAvatarDataUrl({ bg1: '#7F1D1D', bg2: '#F43F5E', accent: '#99F6E4', glyph: '7' }) },
  { id: 'g8', dataUrl: makeAvatarDataUrl({ bg1: '#111827', bg2: '#6366F1', accent: '#FDE68A', glyph: '8' }) },
]

const profileSchema = fioFieldsSchema.extend({
  email: z.string().email('Введите корректный email'),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { user, checkAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isAvatarLoading, setIsAvatarLoading] = useState(false)

  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      lastName: '',
      firstName: '',
      middleName: '',
      email: '',
    },
  })

  useEffect(() => {
    if (!user) return
    reset({
      ...parseFullName(user.name),
      email: user.email,
    })
  }, [user, reset])

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true)
    try {
      await api.updateProfile({
        name: formatFullName(data),
        email: data.email,
      })
      await checkAuth()
      toast.success('Профиль обновлён')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка обновления')
    } finally {
      setIsLoading(false)
    }
  }

  const initial = user?.name ? parseFullName(user.name).firstName.charAt(0) : 'U'

  const saveAvatar = async (avatar: string | null) => {
    setIsAvatarLoading(true)
    try {
      await api.updateProfile({ avatar })
      await checkAuth()
      toast.success(avatar ? 'Аватар обновлён' : 'Аватар удалён')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка обновления аватара')
    } finally {
      setIsAvatarLoading(false)
    }
  }

  const onUploadAvatar = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Файл слишком большой. Максимум 800 КБ.')
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : null
      if (!result) {
        toast.error('Не удалось прочитать файл')
        return
      }
      await saveAvatar(result)
    }
    reader.onerror = () => toast.error('Ошибка чтения файла')
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    void onUploadAvatar(file)
    e.target.value = ''
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Профиль</h1>
        <p className="text-muted-foreground">Управление вашим аккаунтом</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {user?.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : (
                <AvatarFallback className="text-xl">
                  {initial.toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle>{user?.name}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Аватар
          </CardTitle>
          <CardDescription>Выберите фото для профиля</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              {user?.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : (
                <AvatarFallback className="text-2xl">{initial.toUpperCase() || 'U'}</AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1 space-y-3">
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isAvatarLoading}
                  onClick={() => uploadInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Свое фото
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isAvatarLoading || !user?.avatar}
                  onClick={() => saveAvatar(null)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Убрать
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Нажмите на вариант, чтобы применить его сразу.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Предложенные</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {suggestedAvatars.map((a) => {
                const selected = user?.avatar === a.dataUrl
                return (
                  <button
                    key={a.id}
                    type="button"
                    className="rounded-full border border-border/60 p-0.5 transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Выбрать аватар"
                    disabled={isAvatarLoading}
                    onClick={() => saveAvatar(a.dataUrl)}
                  >
                    <Avatar className={`h-12 w-12 ${selected ? 'ring-2 ring-primary' : ''}`}>
                      <AvatarImage src={a.dataUrl} alt="Предложенный аватар" />
                    </Avatar>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Галерея</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {galleryAvatars.map((a) => {
                const selected = user?.avatar === a.dataUrl
                return (
                  <button
                    key={a.id}
                    type="button"
                    className="rounded-full border border-border/60 p-0.5 transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Выбрать аватар"
                    disabled={isAvatarLoading}
                    onClick={() => saveAvatar(a.dataUrl)}
                  >
                    <Avatar className={`h-12 w-12 ${selected ? 'ring-2 ring-primary' : ''}`}>
                      <AvatarImage src={a.dataUrl} alt="Аватар из галереи" />
                    </Avatar>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Личные данные
          </CardTitle>
          <CardDescription>Фамилия, имя и отчество — как в документах</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="lastName">Фамилия</FieldLabel>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  {...register('lastName')}
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="firstName">Имя</FieldLabel>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  {...register('firstName')}
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="middleName">Отчество</FieldLabel>
                <Input
                  id="middleName"
                  autoComplete="additional-name"
                  {...register('middleName')}
                  disabled={isLoading}
                />
                {errors.middleName && (
                  <p className="text-sm text-destructive">{errors.middleName.message}</p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@mail.com"
                  {...register('email')}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </Field>
            </FieldGroup>

            <Separator />

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
