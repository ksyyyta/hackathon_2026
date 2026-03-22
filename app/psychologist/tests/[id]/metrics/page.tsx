'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import type { Question, TestMetric } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function TestMetricsPage() {
  const { id } = useParams<{ id: string }>()
  const [metrics, setMetrics] = useState<TestMetric[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null)

  const load = async () => {
    try {
      const [test, loadedMetrics] = await Promise.all([api.getTest(id), api.getTestMetrics(id)])
      setQuestions(test.questions || [])
      setMetrics(loadedMetrics || [])
      if (!selectedMetricId && loadedMetrics.length) {
        setSelectedMetricId(loadedMetrics[0].id)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось загрузить метрики')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const selectedMetric = metrics.find((m) => m.id === selectedMetricId) ?? null

  const updateMetric = (metricId: string, patch: Partial<TestMetric>) => {
    setMetrics((prev) => prev.map((m) => (m.id === metricId ? { ...m, ...patch } : m)))
  }

  const addMetric = () => {
    const newMetric: TestMetric = {
      id: `metric_${Date.now()}`,
      name: 'Новая метрика',
      description: '',
      rules: [],
    }
    setMetrics((prev) => [...prev, newMetric])
    setSelectedMetricId(newMetric.id)
  }

  const removeMetric = (metricId: string) => {
    setMetrics((prev) => prev.filter((m) => m.id !== metricId))
    setSelectedMetricId((prev) => (prev === metricId ? null : prev))
  }

  const getRule = (metric: TestMetric, questionId: string) => {
    return metric.rules.find((r) => r.question_id === questionId)
  }

  const upsertChoiceScore = (metric: TestMetric, questionId: string, optionId: string, score: number) => {
    const existing = getRule(metric, questionId)
    const nextRules = [...metric.rules]
    const idx = nextRules.findIndex((r) => r.question_id === questionId)
    const nextRule = {
      question_id: questionId,
      type: 'choice' as const,
      scores: { ...(existing?.scores || {}), [optionId]: score },
    }
    if (idx >= 0) nextRules[idx] = nextRule
    else nextRules.push(nextRule)
    updateMetric(metric.id, { rules: nextRules })
  }

  const upsertScaleMultiplier = (metric: TestMetric, questionId: string, multiplier: number) => {
    const nextRules = [...metric.rules]
    const idx = nextRules.findIndex((r) => r.question_id === questionId)
    const nextRule = {
      question_id: questionId,
      type: 'scale' as const,
      multiplier,
    }
    if (idx >= 0) nextRules[idx] = nextRule
    else nextRules.push(nextRule)
    updateMetric(metric.id, { rules: nextRules })
  }

  const saveAll = async () => {
    try {
      await api.saveTestMetrics(id, metrics)
      toast.success('Метрики сохранены')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка сохранения')
    }
  }

  return (
    <div className="p-4 grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader className="space-y-3">
          <CardTitle>Метрики</CardTitle>
          <Button onClick={addMetric}>Добавить метрику</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {metrics.length === 0 && <p className="text-sm text-muted-foreground">Метрики еще не добавлены</p>}
          {metrics.map((m) => (
            <button
              type="button"
              key={m.id}
              className={`w-full text-left rounded border p-3 ${selectedMetricId === m.id ? 'border-primary' : ''}`}
              onClick={() => setSelectedMetricId(m.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.name || 'Без названия'}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.description || 'Без описания'}</p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeMetric(m.id)
                  }}
                >
                  Удалить
                </Button>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Настройка метрики</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedMetric ? (
            <p className="text-sm text-muted-foreground">Выберите метрику слева</p>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Название</p>
                <Input
                  value={selectedMetric.name}
                  onChange={(e) => updateMetric(selectedMetric.id, { name: e.target.value })}
                  placeholder="Например: Творческий потенциал"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Описание (для отчета)</p>
                <Textarea
                  value={selectedMetric.description}
                  onChange={(e) => updateMetric(selectedMetric.id, { description: e.target.value })}
                  placeholder="Описание метрики, которое увидит психолог в отчете"
                  rows={3}
                />
              </div>
              <div className="space-y-4">
                <p className="text-sm font-medium">Связь с вопросами</p>
                {questions.map((q) => {
                  const rule = getRule(selectedMetric, q.id)
                  return (
                    <div key={q.id} className="rounded border p-3 space-y-2">
                      <p className="font-medium">{q.text || q.id}</p>
                      {q.type === 'single' || q.type === 'multiple' ? (
                        <div className="space-y-2">
                          {q.options.map((opt) => (
                            <div key={opt.id} className="flex items-center justify-between gap-3">
                              <span className="text-sm">{opt.text || opt.id}</span>
                              <Input
                                type="number"
                                className="w-32"
                                value={String(rule?.scores?.[opt.id] ?? 0)}
                                onChange={(e) =>
                                  upsertChoiceScore(selectedMetric, q.id, opt.id, Number(e.target.value) || 0)
                                }
                              />
                            </div>
                          ))}
                        </div>
                      ) : q.type === 'scale' ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm">Баллы за шкалу (множитель)</span>
                          <Input
                            type="number"
                            className="w-32"
                            value={String(rule?.multiplier ?? 0)}
                            onChange={(e) =>
                              upsertScaleMultiplier(selectedMetric, q.id, Number(e.target.value) || 0)
                            }
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Для этого типа вопроса баллы метрики не задаются.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              <Button onClick={saveAll}>Сохранить</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
