'use client'

import { useState, type ElementType } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Plus,
  Trash2,
  CircleDot,
  CheckSquare,
  SlidersHorizontal,
  MessageSquare,
  Hash,
} from 'lucide-react'

import { useTestEditor } from '@/lib/contexts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Empty } from '@/components/ui/empty'
import type { Question, QuestionType, QuestionOption, QuestionShowIf } from '@/lib/types'
import { cn } from '@/lib/utils'

const questionTypes: { type: QuestionType; label: string; icon: ElementType }[] = [
  { type: 'single', label: 'Одиночный выбор', icon: CircleDot },
  { type: 'multiple', label: 'Множественный выбор', icon: CheckSquare },
  { type: 'scale', label: 'Шкала (Лайкерт)', icon: SlidersHorizontal },
  { type: 'number', label: 'Числовой ввод', icon: Hash },
  { type: 'open', label: 'Открытый ответ', icon: MessageSquare },
]

export function TestQuestionsEditor() {
  const { test, addQuestion, updateQuestion, removeQuestion, reorderQuestions } = useTestEditor()
  const questions = test?.questions || []
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleAddQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type,
      text: '',
      required: true,
      options:
        type === 'single' || type === 'multiple'
          ? [{ id: `o_${Date.now()}`, text: '', weight: 1 }]
          : [],
      ...(type === 'scale' && { scaleMin: 1, scaleMax: 5 }),
      ...(type === 'number' && { numberMin: 0, numberMax: 100 }),
    }
    addQuestion(newQuestion)
    setExpandedId(newQuestion.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = questions.findIndex((q) => q.id === active.id)
    const newIndex = questions.findIndex((q) => q.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    reorderQuestions(arrayMove(questions, oldIndex, newIndex))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Вопросы</CardTitle>
              <CardDescription>
                Перетаскивайте за ручку для изменения порядка. Разделы задаются полем «Заголовок
                раздела».
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить вопрос
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {questionTypes.map((qt) => (
                  <DropdownMenuItem key={qt.type} onClick={() => handleAddQuestion(qt.type)}>
                    <qt.icon className="mr-2 h-4 w-4" />
                    {qt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <Empty title="Нет вопросов" description="Добавьте первый вопрос для теста" />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <SortableQuestionCard
                      key={question.id}
                      id={question.id}
                      question={question}
                      index={index}
                      allQuestions={questions}
                      isExpanded={expandedId === question.id}
                      onToggle={() => setExpandedId(expandedId === question.id ? null : question.id)}
                      onUpdate={(data) => updateQuestion(question.id, data)}
                      onRemove={() => removeQuestion(question.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SortableQuestionCard({
  id,
  question,
  index,
  allQuestions,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
}: {
  id: string
  question: Question
  index: number
  allQuestions: Question[]
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (data: Partial<Question>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-background">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <button
          type="button"
          className="touch-none p-1 rounded-md hover:bg-muted text-muted-foreground shrink-0"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="Перетащить вопрос"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <QuestionCardInner question={question} index={index} onRemove={onRemove} />
      </div>
      {isExpanded && (
        <div className="border-t p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
          <QuestionCardExpanded
          question={question}
          questionIndex={index}
          allQuestions={allQuestions}
          onUpdate={onUpdate}
        />
        </div>
      )}
    </div>
  )
}

function QuestionCardInner({
  question,
  index,
  onRemove,
}: {
  question: Question
  index: number
  onRemove: () => void
}) {
  const typeInfo = questionTypes.find((qt) => qt.type === question.type)
  return (
    <>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">{index + 1}.</span>
          <Badge variant="secondary" className="shrink-0">
            {typeInfo?.label}
          </Badge>
          {question.required && (
            <Badge variant="outline" className="shrink-0">
              Обязательный
            </Badge>
          )}
          {question.sectionTitle && (
            <Badge variant="outline" className="shrink-0 text-xs font-normal">
              {question.sectionTitle}
            </Badge>
          )}
        </div>
        <p className={cn('text-sm truncate', !question.text && 'text-muted-foreground italic')}>
          {question.text || 'Без названия'}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-destructive hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  )
}

function QuestionCardExpanded({
  question,
  questionIndex,
  allQuestions,
  onUpdate,
}: {
  question: Question
  questionIndex: number
  allQuestions: Question[]
  onUpdate: (data: Partial<Question>) => void
}) {
  const handleAddOption = () => {
    onUpdate({
      options: [...question.options, { id: `o_${Date.now()}`, text: '', weight: 1 }],
    })
  }

  const handleUpdateOption = (optionId: string, data: Partial<QuestionOption>) => {
    onUpdate({
      options: question.options.map((o) => (o.id === optionId ? { ...o, ...data } : o)),
    })
  }

  const handleRemoveOption = (optionId: string) => {
    onUpdate({
      options: question.options.filter((o) => o.id !== optionId),
    })
  }

  return (
    <>
      <FieldGroup>
        <Field>
          <FieldLabel>Заголовок раздела (необязательно)</FieldLabel>
          <Input
            value={question.sectionTitle || ''}
            onChange={(e) => onUpdate({ sectionTitle: e.target.value || undefined })}
            placeholder="Например: Мотивация и интересы"
          />
        </Field>
        <Field>
          <FieldLabel>Текст вопроса</FieldLabel>
          <Textarea
            value={question.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Введите текст вопроса"
            rows={2}
          />
        </Field>
        <Field>
          <FieldLabel className="mb-0">Id вопроса (для подсчета)</FieldLabel>
          <p className="font-mono text-sm rounded-md border bg-muted/40 px-3 py-2">{question.id}</p>
          <p className="text-xs text-muted-foreground mt-1">
            В правилах подсчета: <code className="bg-muted px-1 rounded">id_варианта</code>,{' '}
            <code className="bg-muted px-1 rounded">id_score</code>. Символы{' '}
            <code className="bg-muted px-1">-</code> и <code className="bg-muted px-1">.</code> в id
            на бэкенде заменяются на <code className="bg-muted px-1">_</code>.
          </p>
        </Field>
        <Field>
          <FieldLabel>Условие показа (ветвление)</FieldLabel>
          <p className="text-xs text-muted-foreground mb-2">
            Показывать этот вопрос только если в более раннем вопросе с одиночным или множественным
            выбором отмечены указанные варианты. Пусто — вопрос всегда в ленте.
          </p>
          <div className="space-y-2">
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={question.showIf?.questionId || ''}
              onChange={(e) => {
                const qid = e.target.value || undefined
                if (!qid) {
                  onUpdate({ showIf: undefined })
                  return
                }
                const prev = question.showIf
                onUpdate({
                  showIf: {
                    questionId: qid,
                    optionIds: prev?.questionId === qid ? prev.optionIds : [],
                  } satisfies QuestionShowIf,
                })
              }}
            >
              <option value="">— Нет условия —</option>
              {allQuestions.slice(0, questionIndex).map((pq) =>
                pq.type === 'single' || pq.type === 'multiple' ? (
                  <option key={pq.id} value={pq.id}>
                    {pq.text?.slice(0, 60) || pq.id}
                  </option>
                ) : null
              )}
            </select>
            {question.showIf?.questionId &&
              (() => {
                const parent = allQuestions.find((q) => q.id === question.showIf?.questionId)
                if (!parent?.options?.length) return null
                return (
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Варианты-условия</p>
                    {parent.options.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={question.showIf?.optionIds?.includes(o.id) ?? false}
                          onChange={(e) => {
                            const cur = new Set(question.showIf?.optionIds || [])
                            if (e.target.checked) cur.add(o.id)
                            else cur.delete(o.id)
                            onUpdate({
                              showIf: {
                                questionId: question.showIf!.questionId,
                                optionIds: Array.from(cur),
                              },
                            })
                          }}
                        />
                        <span>{o.text || o.id}</span>
                      </label>
                    ))}
                  </div>
                )
              })()}
          </div>
        </Field>
        <Field className="flex items-start justify-between">
          <FieldLabel className="mb-0 pt-1">Обязательный вопрос</FieldLabel>
          <Switch
            checked={question.required}
            onCheckedChange={(checked) => onUpdate({ required: checked })}
          />
        </Field>
      </FieldGroup>

      {(question.type === 'single' || question.type === 'multiple') && (
        <div className="space-y-3">
          <FieldLabel>Варианты ответов</FieldLabel>
          {question.options.map((option, optIndex) => (
            <div key={option.id} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-6">{optIndex + 1}.</span>
              <Input
                value={option.text}
                onChange={(e) => handleUpdateOption(option.id, { text: e.target.value })}
                placeholder="Текст варианта"
                className="flex-1"
              />
              <Input
                type="number"
                value={option.weight}
                onChange={(e) => handleUpdateOption(option.id, { weight: Number(e.target.value) })}
                className="w-20"
                placeholder="Вес"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveOption(option.id)}
                disabled={question.options.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleAddOption}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить вариант
          </Button>
        </div>
      )}

      {question.type === 'scale' && (
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Минимум</FieldLabel>
              <Input
                type="number"
                value={question.scaleMin || 1}
                onChange={(e) => onUpdate({ scaleMin: Number(e.target.value) })}
              />
            </Field>
            <Field>
              <FieldLabel>Максимум</FieldLabel>
              <Input
                type="number"
                value={question.scaleMax || 5}
                onChange={(e) => onUpdate({ scaleMax: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Метка минимума</FieldLabel>
              <Input
                value={question.scaleMinLabel || ''}
                onChange={(e) => onUpdate({ scaleMinLabel: e.target.value })}
                placeholder="Например: Не согласен"
              />
            </Field>
            <Field>
              <FieldLabel>Метка максимума</FieldLabel>
              <Input
                value={question.scaleMaxLabel || ''}
                onChange={(e) => onUpdate({ scaleMaxLabel: e.target.value })}
                placeholder="Например: Полностью согласен"
              />
            </Field>
          </div>
        </FieldGroup>
      )}

      {question.type === 'number' && (
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Минимум</FieldLabel>
              <Input
                type="number"
                value={question.numberMin ?? 0}
                onChange={(e) => onUpdate({ numberMin: Number(e.target.value) })}
              />
            </Field>
            <Field>
              <FieldLabel>Максимум</FieldLabel>
              <Input
                type="number"
                value={question.numberMax ?? 100}
                onChange={(e) => onUpdate({ numberMax: Number(e.target.value) })}
              />
            </Field>
          </div>
        </FieldGroup>
      )}
    </>
  )
}
