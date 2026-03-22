'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useTestEditor } from '@/lib/contexts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Question } from '@/lib/types'
import { visibleQuestionsInOrder } from '@/lib/question-visibility'

export function TestPreviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { test } = useTestEditor()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})

  const questions = test?.questions || []
  const visibleQuestions = useMemo(
    () => visibleQuestionsInOrder(questions, answers),
    [questions, answers]
  )
  const currentQuestion = visibleQuestions[currentIndex]
  const progress =
    visibleQuestions.length > 0 ? ((currentIndex + 1) / visibleQuestions.length) * 100 : 0

  useEffect(() => {
    if (visibleQuestions.length > 0 && currentIndex >= visibleQuestions.length) {
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

  const handleAnswer = (questionId: string, value: unknown) => {
    setAnswers({ ...answers, [questionId]: value })
  }

  if (!test) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Предпросмотр теста</DialogTitle>
          <DialogDescription>
            Так тест будет выглядеть для клиента
          </DialogDescription>
        </DialogHeader>

        {visibleQuestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Добавьте вопросы для предпросмотра
          </div>
        ) : (
          <div className="space-y-6">
            {/* Test header */}
            <Card>
              <CardHeader>
                <CardTitle>{test.title}</CardTitle>
                <CardDescription>{test.description}</CardDescription>
              </CardHeader>
              {test.instruction && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{test.instruction}</p>
                </CardContent>
              )}
            </Card>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Вопрос {currentIndex + 1} из {visibleQuestions.length}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>

            {/* Current question */}
            <Card>
              <CardContent className="pt-6">
                {currentQuestion && (
                  <>
                    {currentQuestion.sectionTitle && (
                      <p className="text-sm font-semibold text-primary mb-4 border-b pb-2">
                        {currentQuestion.sectionTitle}
                      </p>
                    )}
                    <QuestionPreview
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
              <Button
                onClick={handleNext}
                disabled={currentIndex === visibleQuestions.length - 1}
              >
                Далее
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function QuestionPreview({
  question,
  answer,
  onAnswer,
}: {
  question: Question
  answer: unknown
  onAnswer: (value: unknown) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">
          {question.text}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </p>
      </div>

      {question.type === 'single' && (
        <RadioGroup
          value={(answer as string) || ''}
          onValueChange={onAnswer}
        >
          {question.options.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <RadioGroupItem value={option.id} id={option.id} />
              <Label htmlFor={option.id}>{option.text}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {question.type === 'multiple' && (
        <div className="space-y-2">
          {question.options.map((option) => {
            const selected = (answer as string[] | undefined)?.includes(option.id) || false
            return (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={selected}
                  onCheckedChange={(checked) => {
                    const current = (answer as string[]) || []
                    if (checked) {
                      onAnswer([...current, option.id])
                    } else {
                      onAnswer(current.filter((id) => id !== option.id))
                    }
                  }}
                />
                <Label htmlFor={option.id}>{option.text}</Label>
              </div>
            )
          })}
        </div>
      )}

      {question.type === 'scale' && (
        <div className="space-y-4">
          <Slider
            value={[answer as number || question.scaleMin || 1]}
            onValueChange={([value]) => onAnswer(value)}
            min={question.scaleMin || 1}
            max={question.scaleMax || 5}
            step={1}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{question.scaleMinLabel || question.scaleMin}</span>
            <span>{question.scaleMaxLabel || question.scaleMax}</span>
          </div>
        </div>
      )}

      {question.type === 'open' && (
        <Textarea
          value={answer as string || ''}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Введите ваш ответ..."
          rows={4}
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
