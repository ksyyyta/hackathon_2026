'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { api } from '@/lib/api'

const testSchema = z.object({
  title: z.string().min(3, 'Название должно быть минимум 3 символа'),
  description: z.string().min(10, 'Описание должно быть минимум 10 символов'),
  instruction: z.string().optional(),
})

type TestForm = z.infer<typeof testSchema>

export default function NewTestPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TestForm>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      title: '',
      description: '',
      instruction: '',
    },
  })

  const onSubmit = async (data: TestForm) => {
    setIsLoading(true)
    try {
      const test = await api.createTest({
        ...data,
        questions: [],
        formulas: [],
      })
      toast.success('Тест создан')
      router.push(`/dashboard/tests/${test.id}/edit`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать тест')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/tests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Новый тест</h1>
          <p className="text-muted-foreground">Создайте основу для вашего теста</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
          <CardDescription>
            Эти данные будут отображаться клиентам перед началом теста
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="title">Название теста</FieldLabel>
                <Input
                  id="title"
                  placeholder="Например: Тест профориентации"
                  {...register('title')}
                  disabled={isLoading}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Описание</FieldLabel>
                <Textarea
                  id="description"
                  placeholder="Краткое описание теста для клиентов"
                  rows={3}
                  {...register('description')}
                  disabled={isLoading}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="instruction">Инструкция (опционально)</FieldLabel>
                <Textarea
                  id="instruction"
                  placeholder="Инструкции для прохождения теста"
                  rows={3}
                  {...register('instruction')}
                  disabled={isLoading}
                />
              </Field>
            </FieldGroup>

            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" asChild>
                <Link href="/dashboard/tests">Отмена</Link>
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать и перейти к редактированию
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
