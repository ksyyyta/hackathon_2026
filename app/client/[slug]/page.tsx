'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { api } from '@/lib/api'
import type { PublicTest } from '@/lib/types'

const schema = z.object({
  name: z.string().min(3, 'Введите имя'),
  email: z.string().email('Введите корректный email').optional().or(z.literal('')),
})

type Values = z.infer<typeof schema>

export default function ClientIntroPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [test, setTest] = useState<PublicTest | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  })

  useEffect(() => {
    api.getPublicTestBySlug(slug)
      .then(setTest)
      .catch(() => toast.error('Ссылка недействительна'))
  }, [slug])

  const onSubmit = async (values: Values) => {
    setIsLoading(true)
    try {
      const { attemptId } = await api.startTestBySlug(slug, {
        name: values.name,
        email: values.email || undefined,
      })
      sessionStorage.setItem(`client-attempt-${slug}`, attemptId)
      router.push(`/client/${slug}/take`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось начать прохождение')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>{test?.title ?? 'Загрузка теста...'}</CardTitle>
          <CardDescription>{test?.description ?? 'Пожалуйста, подождите'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Имя</FieldLabel>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </Field>
            </FieldGroup>
            <Button className="w-full" type="submit" disabled={isLoading || !test}>
              Начать прохождение
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
