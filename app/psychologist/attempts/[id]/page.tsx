'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import type { Attempt } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PsychologistAttemptDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const [attempt, setAttempt] = useState<Attempt | null>(null)

  const load = async () => {
    try {
      setAttempt(await api.getPsychologistAttempt(id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось загрузить попытку')
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const generateReport = async () => {
    try {
      await api.generateAttemptReport(id)
      toast.success('Отчет сгенерирован')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка генерации отчета')
    }
  }

  const markSent = async () => {
    try {
      await api.sendAttemptReport(id)
      toast.success('Отмечено как отправлено')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка отправки')
    }
  }

  const openClientHtml = () => {
    api.fetchPsychologistClientReportHtml(id)
      .then((html) => {
        const w = window.open('', '_blank')
        if (w) {
          w.document.write(html)
          w.document.close()
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Не удалось открыть клиентский HTML'))
  }

  const openProfHtml = () => {
    api.fetchPsychologistReportHtml(id)
      .then((html) => {
        const w = window.open('', '_blank')
        if (w) {
          w.document.write(html)
          w.document.close()
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Не удалось открыть проф. HTML'))
  }

  const downloadDocx = () => {
    api.downloadPsychologistReportDocx(id)
      .then((blob) => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `report-${id}.docx`
        a.click()
        URL.revokeObjectURL(a.href)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Не удалось скачать DOCX'))
  }

  if (!attempt) {
    return <div className="p-6 text-muted-foreground">Загрузка...</div>
  }

  const questionTextById = new Map((attempt.questions || []).map((q) => [q.id, q.text || q.id]))

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Попытка клиента: {attempt.clientName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Email: {attempt.clientEmail || '-'}</p>
          <p>Статус: {attempt.status}</p>
          <p>Отчет сгенерирован: {attempt.reportGeneratedAt || 'нет'}</p>
          <p>Отчет отправлен: {attempt.reportSentAt || 'нет'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Действия с отчетом</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={generateReport}>Сгенерировать отчет</Button>
          <Button variant="outline" onClick={openProfHtml}>Проф. HTML</Button>
          <Button variant="outline" onClick={openClientHtml}>Клиентский HTML</Button>
          <Button variant="outline" onClick={downloadDocx}>DOCX</Button>
          <Button variant="secondary" onClick={markSent}>Отметить "Отправлено"</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Метрики прохождения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {attempt.results?.simpleMetrics?.length ? (
            attempt.results.simpleMetrics.map((m) => (
              <div key={m.id || m.name} className="rounded border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{m.name}</span>
                  <span>{m.value}</span>
                </div>
                {m.description && <p className="text-muted-foreground">{m.description}</p>}
                {m.details?.length ? (
                  <div className="space-y-1">
                    {m.details.map((row, idx) => (
                      <div key={`${row.questionId}-${idx}`} className="flex items-center justify-between text-xs">
                        <span>Вопрос: {questionTextById.get(row.questionId) || row.questionId}</span>
                        <span>{row.score}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : attempt.metrics?.length ? (
            attempt.metrics.map((m) => (
              <div key={m.name} className="flex items-center justify-between rounded border p-2">
                <span>{m.name}</span>
                <span>{m.value}</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">Метрики еще не рассчитаны</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
