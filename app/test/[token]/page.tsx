'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Brain,
  CheckCircle,
  Home,
  RotateCcw,
  FileDown,
  ExternalLink,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { fioFieldsSchema, formatFullName } from '@/lib/fio'
import { visibleQuestionsInOrder } from '@/lib/question-visibility'
import type { PublicTest, Question, Answer, TestResult } from '@/lib/types'

function isAnswerFilled(q: Question, v: unknown): boolean {
  if (!q.required) return true
  if (v === undefined || v === null) return false
  if (typeof v === 'string' && !v.trim()) return false
  if (Array.isArray(v) && v.length === 0) return false
  if (q.type === 'number' && typeof v === 'number' && Number.isNaN(v)) return false
  return true
}

const personalDataSchema = fioFieldsSchema.extend({
  email: z.string().email('Введите корректный email').optional().or(z.literal('')),
  age: z.coerce.number().min(10).max(100).optional(),
})

type PersonalData = z.infer<typeof personalDataSchema>

type TestState = 'loading' | 'intro' | 'personal' | 'questions' | 'completed' | 'result' | 'error'

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [state, setState] = useState<TestState>('loading')
  const [test, setTest] = useState<PublicTest | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [result, setResult] = useState<TestResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalData>({
    resolver: zodResolver(personalDataSchema),
  })

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const data = await api.getPublicTest(token)
        setTest(data)
        setState('intro')
      } catch {
        toast.error('Ссылка недействительна или тест удалён')
        setTest(null)
        setState('error')
      }
    }
    fetchTest()
  }, [token])

  const answersRef = useRef(answers)
  answersRef.current = answers

  const saveAnswers = useCallback(async () => {
    const current = answersRef.current
    if (!attemptId || Object.keys(current).length === 0) return

    const formattedAnswers: Answer[] = Object.entries(current).map(([questionId, value]) => ({
      questionId,
      value: value as Answer['value'],
    }))

    try {
      await api.submitAnswers(attemptId, formattedAnswers)
    } catch {
      localStorage.setItem(`test-${token}-answers`, JSON.stringify(current))
    }
  }, [attemptId, token])

  useEffect(() => {
    if (state !== 'questions' || !attemptId) return
    const t = setTimeout(() => {
      void saveAnswers()
    }, 2000)
    return () => clearTimeout(t)
  }, [answers, state, attemptId, saveAnswers])

  useEffect(() => {
    if (state !== 'questions' || !attemptId) return
    const load = async () => {
      try {
        const { answers: saved } = await api.getProgress(attemptId)
        const fromServer: Record<string, unknown> = {}
        for (const a of saved) {
          fromServer[a.questionId] = a.value
        }
        const raw = localStorage.getItem(`test-${token}-answers`)
        const fromLs = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
        setAnswers((prev) => ({ ...fromLs, ...fromServer, ...prev }))
      } catch {
        /* offline / demo */
      }
    }
    void load()
  }, [state, attemptId, token])

  const handleStart = async () => {
    if (!test) return
    if (test.requiresPersonalData) {
      setState('personal')
      return
    }
    setIsStarting(true)
    try {
      const { attemptId: newAttemptId } = await api.startTest(token, { name: 'Гость' })
      setAttemptId(newAttemptId)
      setState('questions')
    } catch {
      toast.error('Не удалось начать тест. Проверьте подключение к серверу.')
    } finally {
      setIsStarting(false)
    }
  }

  const handleBackToIntro = () => {
    setState('intro')
    setCurrentIndex(0)
    setAnswers({})
    setAttemptId(null)
    setResult(null)
  }

  const handlePersonalData = async (data: PersonalData) => {
    setIsSubmitting(true)
    try {
      const { attemptId: newAttemptId } = await api.startTest(token, {
        name: formatFullName(data),
        email: data.email || undefined,
        age: data.age,
      })
      setAttemptId(newAttemptId)
      setState('questions')
    } catch {
      toast.error('Не удалось начать тест')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAnswer = (questionId: string, value: unknown) => {
    setAnswers({ ...answers, [questionId]: value })
  }

  const visibleQuestions = useMemo(
    () => (test ? visibleQuestionsInOrder(test.questions, answers) : []),
    [test, answers]
  )

  useEffect(() => {
    if (visibleQuestions.length === 0) return
    if (currentIndex >= visibleQuestions.length) {
      setCurrentIndex(visibleQuestions.length - 1)
    }
  }, [visibleQuestions.length, currentIndex])

  const handleNext = () => {
    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      await saveAnswers()
      if (!attemptId) {
        toast.error('Нет активного прохождения')
        return
      }
      await api.completeTest(attemptId)
      setResult(null)
      setState('completed')
      localStorage.removeItem(`test-${token}-answers`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось завершить тест'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canComplete = () => {
    if (!test) return false
    return visibleQuestions.every((q) => isAnswerFilled(q, answers[q.id]))
  }

  const progress =
    test && visibleQuestions.length > 0
      ? ((currentIndex + 1) / visibleQuestions.length) * 100
      : 0
  const currentQuestion = visibleQuestions[currentIndex]

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (state === 'error' || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Тест не найден</CardTitle>
            <CardDescription>
              Ссылка недействительна или срок её действия истёк
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (state === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">{test.title}</CardTitle>
            <CardDescription>{test.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {test.instruction && (
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm">{test.instruction}</p>
              </div>
            )}
            <div className="text-center text-sm text-muted-foreground">
              <p>
                {(() => {
                  const minV = visibleQuestionsInOrder(test.questions, {}).length
                  const maxV = test.questions.length
                  return minV < maxV
                    ? `От ${minV} до ${maxV} вопросов (есть ветвление по ответам)`
                    : `${maxV} вопросов`
                })()}
              </p>
            </div>
            <Button className="w-full" size="lg" onClick={handleStart} disabled={isStarting}>
              {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Начать тест
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/">На главную</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'personal') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Ваши данные</CardTitle>
            <CardDescription>
              Заполните информацию о себе перед началом теста
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="ghost"
              className="mb-2 -ml-2"
              onClick={() => setState('intro')}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              К описанию
            </Button>
            <form onSubmit={handleSubmit(handlePersonalData)} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="lastName">Фамилия *</FieldLabel>
                  <Input
                    id="lastName"
                    placeholder="Иванов"
                    autoComplete="family-name"
                    {...register('lastName')}
                    disabled={isSubmitting}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="firstName">Имя *</FieldLabel>
                  <Input
                    id="firstName"
                    placeholder="Иван"
                    autoComplete="given-name"
                    {...register('firstName')}
                    disabled={isSubmitting}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="middleName">Отчество *</FieldLabel>
                  <Input
                    id="middleName"
                    placeholder="Иванович"
                    autoComplete="additional-name"
                    {...register('middleName')}
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="age">Возраст</FieldLabel>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    {...register('age')}
                    disabled={isSubmitting}
                  />
                </Field>
              </FieldGroup>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Продолжить
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Спасибо за прохождение!</CardTitle>
            <CardDescription>
              Результаты будут отправлены вам после обработки психологом.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button type="button" variant="outline" className="w-full" onClick={handleBackToIntro}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Вернуться к описанию
            </Button>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                На главную
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'result') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Тест завершён!</CardTitle>
            <CardDescription>Спасибо за прохождение теста</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {result?.metrics && result.metrics.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Ваши результаты:</h3>
                {result.metrics.map((metric) => (
                  <div key={metric.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{metric.name}</span>
                      <span className="font-medium">{metric.value}%</span>
                    </div>
                    <Progress value={metric.value} />
                    {metric.description && (
                      <p className="text-xs text-muted-foreground">{metric.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {result?.interpretation && (
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm">{result.interpretation}</p>
              </div>
            )}

            {result?.canDownloadReport && attemptId && (
              <div className="space-y-2 rounded-lg border bg-background p-3">
                <p className="text-sm font-medium text-center">Скачать отчёт для клиента</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1"
                    onClick={async () => {
                      try {
                        await api.downloadPublicClientReport(attemptId, 'docx')
                        toast.success('Отчёт сохранён')
                      } catch {
                        toast.error('Не удалось скачать DOCX')
                      }
                    }}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    DOCX
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      try {
                        await api.downloadPublicClientReport(attemptId, 'html')
                      } catch {
                        toast.error('Не удалось открыть HTML-отчёт')
                      }
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    HTML
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Вернуться назад
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleBackToIntro}>
                <RotateCcw className="mr-2 h-4 w-4" />
                К описанию теста
              </Button>
              <Button variant="secondary" className="w-full" asChild>
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  На главную
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Questions state
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-semibold">{test.title}</h1>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Вопрос {currentIndex + 1} из {visibleQuestions.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Question */}
        <Card>
          <CardContent className="pt-6">
            {currentQuestion && (
              <>
                {currentQuestion.sectionTitle && (
                  <p className="text-sm font-semibold text-primary mb-4 border-b pb-2">
                    {currentQuestion.sectionTitle}
                  </p>
                )}
                <QuestionComponent
                  question={currentQuestion}
                  answer={answers[currentQuestion.id]}
                  onAnswer={(value) => handleAnswer(currentQuestion.id, value)}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>

          {currentIndex === visibleQuestions.length - 1 ? (
            <Button
              onClick={handleComplete}
              disabled={!canComplete() || isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Завершить тест
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Далее
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Required questions indicator */}
        {!canComplete() && currentIndex === visibleQuestions.length - 1 && (
          <p className="text-center text-sm text-destructive">
            Ответьте на все обязательные вопросы для завершения теста
          </p>
        )}
      </div>
    </div>
  )
}

function QuestionComponent({
  question,
  answer,
  onAnswer,
}: {
  question: Question
  answer: unknown
  onAnswer: (value: unknown) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg font-medium">
          {question.text}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </p>
      </div>

      {question.type === 'single' && (
        <RadioGroup
          value={answer as string}
          onValueChange={onAnswer}
          className="space-y-3"
        >
          {question.options.map((option) => (
            <div
              key={option.id}
              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
            >
              <RadioGroupItem value={option.id} id={option.id} />
              <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                {option.text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {question.type === 'multiple' && (
        <div className="space-y-3">
          {question.options.map((option) => {
            const selected = (answer as string[] | undefined)?.includes(option.id) || false
            return (
              <div
                key={option.id}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  const current = (answer as string[]) || []
                  if (selected) {
                    onAnswer(current.filter((id) => id !== option.id))
                  } else {
                    onAnswer([...current, option.id])
                  }
                }}
              >
                <Checkbox id={option.id} checked={selected} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.text}
                </Label>
              </div>
            )
          })}
        </div>
      )}

      {question.type === 'scale' && (
        <div className="space-y-6 py-4">
          <Slider
            value={[answer as number || question.scaleMin || 1]}
            onValueChange={([value]) => onAnswer(value)}
            min={question.scaleMin || 1}
            max={question.scaleMax || 5}
            step={1}
            className="py-4"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{question.scaleMinLabel || question.scaleMin}</span>
            <span className="text-lg font-semibold text-foreground">
              {answer as number || question.scaleMin || 1}
            </span>
            <span>{question.scaleMaxLabel || question.scaleMax}</span>
          </div>
        </div>
      )}

      {question.type === 'open' && (
        <Textarea
          value={answer as string || ''}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Введите ваш ответ..."
          rows={5}
          className="resize-none"
        />
      )}

      {question.type === 'number' && (
        <Input
          type="number"
          min={question.numberMin ?? undefined}
          max={question.numberMax ?? undefined}
          value={answer === undefined || answer === '' ? '' : String(answer)}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onAnswer(undefined)
              return
            }
            const n = Number(raw)
            onAnswer(Number.isNaN(n) ? undefined : n)
          }}
          className="max-w-xs"
        />
      )}
    </div>
  )
}
