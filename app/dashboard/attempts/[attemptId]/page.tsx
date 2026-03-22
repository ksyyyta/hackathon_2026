'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, User, FileText, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import type { Attempt, Question, Metric } from '@/lib/types'

export default function AttemptDetailsPage() {
  const params = useParams()
  const attemptId = params.attemptId as string
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        const data = await api.getAttempt(attemptId)
        setAttempt(data)
        if (data.questions?.length) setQuestions(data.questions)
      } catch {
        toast.error('Не удалось загрузить прохождение')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAttempt()
  }, [attemptId])

  const handleDownloadClientReport = async () => {
    try {
      const blob = await api.downloadClientReport(attemptId)
      downloadBlob(blob, `report-client-${attemptId}.docx`)
      toast.success('Отчёт скачан')
    } catch {
      toast.error('Ошибка скачивания отчёта')
    }
  }

  const handleDownloadProfessionalReport = async () => {
    try {
      const blob = await api.downloadProfessionalReport(attemptId)
      downloadBlob(blob, `report-professional-${attemptId}.docx`)
      toast.success('Отчёт скачан')
    } catch {
      toast.error('Ошибка скачивания отчёта')
    }
  }

  const openClientReportHtml = async () => {
    try {
      const html = await api.fetchClientReportHtml(attemptId)
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(html)
        w.document.close()
      }
    } catch {
      toast.error('Не удалось открыть отчёт')
    }
  }

  const openProfessionalReportHtml = async () => {
    try {
      const html = await api.fetchProfessionalReportHtml(attemptId)
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(html)
        w.document.close()
      }
    } catch {
      toast.error('Не удалось открыть отчёт')
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48 lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Прохождение не найдено</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/tests">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Детали прохождения</h1>
            <p className="text-muted-foreground">{attempt.testTitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownloadClientReport}>
            <Download className="mr-2 h-4 w-4" />
            DOCX (клиент)
          </Button>
          <Button variant="outline" onClick={openClientReportHtml}>
            HTML (клиент)
          </Button>
          <Button onClick={handleDownloadProfessionalReport}>
            <Download className="mr-2 h-4 w-4" />
            DOCX (проф.)
          </Button>
          <Button variant="outline" onClick={openProfessionalReportHtml}>
            HTML (проф.)
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Информация о клиенте
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Имя</p>
              <p className="font-medium">{attempt.clientName}</p>
            </div>
            {attempt.clientEmail && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{attempt.clientEmail}</p>
              </div>
            )}
            {attempt.clientAge && (
              <div>
                <p className="text-sm text-muted-foreground">Возраст</p>
                <p className="font-medium">{attempt.clientAge} лет</p>
              </div>
            )}
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Статус</p>
              <Badge variant={attempt.status === 'completed' ? 'default' : 'secondary'}>
                {attempt.status === 'completed' ? 'Завершён' : 'В процессе'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Дата прохождения</p>
              <p className="font-medium">
                {format(new Date(attempt.startedAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Метрики
            </CardTitle>
            <CardDescription>Рассчитанные показатели</CardDescription>
          </CardHeader>
          <CardContent>
            {attempt.metrics && attempt.metrics.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {attempt.metrics.map((metric) => (
                  <MetricCard key={metric.name} metric={metric} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Метрики не рассчитаны</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Answers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ответы клиента
          </CardTitle>
          <CardDescription>Все ответы на вопросы теста</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {attempt.answers.map((answer, index) => {
              const question = questions.find((q) => q.id === answer.questionId) || {
                text: `Вопрос ${index + 1}`,
                type: 'open',
              }
              return (
                <div key={answer.questionId} className="border-b pb-4 last:border-0 last:pb-0">
                  <p className="text-sm text-muted-foreground mb-1">
                    Вопрос {index + 1}
                  </p>
                  <p className="font-medium mb-2">{question.text}</p>
                  <div className="bg-muted rounded-md p-3">
                    {Array.isArray(answer.value) ? (
                      <ul className="list-disc list-inside space-y-1">
                        {answer.value.map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{String(answer.value)}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ metric }: { metric: Metric }) {
  const getColorClass = (value: number) => {
    if (value >= 80) return 'bg-emerald-500'
    if (value >= 60) return 'bg-blue-500'
    if (value >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium">{metric.name}</p>
        <span className="text-lg font-bold">{metric.value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${getColorClass(metric.value)}`}
          style={{ width: `${metric.value}%` }}
        />
      </div>
      {metric.description && (
        <p className="text-sm text-muted-foreground">{metric.description}</p>
      )}
    </div>
  )
}
