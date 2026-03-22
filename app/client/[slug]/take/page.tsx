'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { api } from '@/lib/api'
import type { PublicTest } from '@/lib/types'

export default function ClientTakePage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [test, setTest] = useState<PublicTest | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [idx, setIdx] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const id = sessionStorage.getItem(`client-attempt-${slug}`)
    if (!id) {
      router.replace(`/client/${slug}`)
      return
    }
    setAttemptId(id)
    api.getPublicTestBySlug(slug).then(setTest).catch(() => toast.error('Тест не найден'))
  }, [slug, router])

  const q = test?.questions[idx]
  const progress = useMemo(() => {
    if (!test || test.questions.length === 0) return 0
    return ((idx + 1) / test.questions.length) * 100
  }, [idx, test])

  const saveCurrent = async () => {
    if (!attemptId || !q) return
    const v = answers[q.id]
    await api.submitAnswersBySlug(slug, attemptId, [{ questionId: q.id, value: v as never }])
  }

  const next = async () => {
    try {
      await saveCurrent()
      if (!test) return
      if (idx < test.questions.length - 1) {
        setIdx((x) => x + 1)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить ответ')
    }
  }

  const finish = async () => {
    if (!attemptId) return
    setIsSubmitting(true)
    try {
      await saveCurrent()
      await api.completeTestBySlug(slug, attemptId)
      router.replace(`/client/${slug}/complete`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось завершить тест')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!test || !q) {
    return <div className="p-6 text-center text-muted-foreground">Загрузка...</div>
  }

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <CardDescription>Вопрос {idx + 1} из {test.questions.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} />
          <p className="font-medium">{q.text}</p>

          {q.type === 'single' && (
            <RadioGroup
              value={(answers[q.id] as string) ?? ''}
              onValueChange={(value) => setAnswers((a) => ({ ...a, [q.id]: value }))}
            >
              {q.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} />
                  <Label htmlFor={`${q.id}-${opt.id}`}>{opt.text}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {q.type === 'open' && (
            <Textarea
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            />
          )}

          {q.type === 'number' && (
            <Input
              type="number"
              value={typeof answers[q.id] === 'number' ? (answers[q.id] as number) : ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: Number(e.target.value) }))}
            />
          )}

          {q.type === 'scale' && (
            <Slider
              min={q.scaleMin ?? 1}
              max={q.scaleMax ?? 10}
              step={1}
              value={[Number(answers[q.id] ?? q.scaleMin ?? 1)]}
              onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v[0] }))}
            />
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setIdx((x) => Math.max(0, x - 1))} disabled={idx === 0}>
              Назад
            </Button>
            {idx < test.questions.length - 1 ? (
              <Button onClick={next}>Далее</Button>
            ) : (
              <Button onClick={finish} disabled={isSubmitting}>Завершить</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
