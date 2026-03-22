'use client'

import { Plus, Trash2, Info } from 'lucide-react'

import { useTestEditor } from '@/lib/contexts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Empty } from '@/components/ui/empty'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Formula } from '@/lib/types'

export function TestFormulasEditor() {
  const { test, setTest } = useTestEditor()
  const formulas = test?.formulas || []

  const handleAddFormula = () => {
    const newFormula: Formula = {
      id: `f-${Date.now()}`,
      name: '',
      expression: '',
      description: '',
    }
    setTest({
      ...test,
      formulas: [...formulas, newFormula],
    })
  }

  const handleUpdateFormula = (id: string, data: Partial<Formula>) => {
    setTest({
      ...test,
      formulas: formulas.map((f) => (f.id === id ? { ...f, ...data } : f)),
    })
  }

  const handleRemoveFormula = (id: string) => {
    setTest({
      ...test,
      formulas: formulas.filter((f) => f.id !== id),
    })
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Здесь настраивается, как считать итоговые показатели по ответам клиента.
          Если не уверены, начните с простых правил и коротких описаний.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Правила подсчета</CardTitle>
              <CardDescription>
                Настройте, как система будет считать результаты автоматически
              </CardDescription>
            </div>
            <Button onClick={handleAddFormula}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить правило
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formulas.length === 0 ? (
            <Empty
              title="Нет правил подсчета"
              description="Добавьте хотя бы одно правило, чтобы система считала результат"
            />
          ) : (
            <div className="space-y-4">
              {formulas.map((formula, index) => (
                <div key={formula.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm font-medium text-muted-foreground mt-2">
                      #{index + 1}
                    </span>
                    <div className="flex-1">
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Название метрики</FieldLabel>
                          <Input
                            value={formula.name}
                            onChange={(e) =>
                              handleUpdateFormula(formula.id, { name: e.target.value })
                            }
                            placeholder="Например: Творческий потенциал"
                          />
                        </Field>
                        <Field>
                          <FieldLabel>Правило подсчета</FieldLabel>
                          <Textarea
                            value={formula.expression}
                            onChange={(e) =>
                              handleUpdateFormula(formula.id, { expression: e.target.value })
                            }
                            placeholder="Например: q1_o1 * 20 + q2_score * 0.5"
                            rows={2}
                            className="font-mono text-sm"
                          />
                        </Field>
                        <Field>
                          <FieldLabel>Описание (опционально)</FieldLabel>
                          <Input
                            value={formula.description || ''}
                            onChange={(e) =>
                              handleUpdateFormula(formula.id, { description: e.target.value })
                            }
                            placeholder="Краткое описание метрики"
                          />
                        </Field>
                      </FieldGroup>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleRemoveFormula(formula.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variable reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Подсказка по переменным</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2 text-muted-foreground">
            <p>
              <code className="bg-muted px-1 rounded">q1_o1</code> — выбран ли вариант 1 вопроса 1 (0 или 1)
            </p>
            <p>
              <code className="bg-muted px-1 rounded">q1_score</code> — числовой ответ на вопрос 1 (для шкал)
            </p>
            <p>
              <code className="bg-muted px-1 rounded">q1_weight</code> — суммарный вес выбранных вариантов
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
