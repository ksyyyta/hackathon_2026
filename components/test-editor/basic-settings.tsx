'use client'

import { useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { useTestEditor } from '@/lib/contexts'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'

export function TestBasicSettings() {
  const { test, setTest } = useTestEditor()
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (field: string, value: string) => {
    setTest({ ...test, [field]: value })
  }

  const handleExportConfig = async () => {
    if (!test?.id) {
      toast.error('Сначала сохраните тест')
      return
    }
    try {
      const data = await api.exportTestConfig(test.id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `profdnk-test-${test.id}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('Конфигурация экспортирована')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка экспорта')
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !test?.id) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Record<string, unknown>
      const updated = await api.importTestConfig(test.id, data)
      setTest(updated)
      toast.success('Конфигурация импортирована')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Неверный JSON или ошибка сервера')
    } finally {
      e.target.value = ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Основные настройки</CardTitle>
        <CardDescription>
          Название и описание теста, которые увидят клиенты
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>Импорт / экспорт методики</FieldLabel>
            <p className="text-sm text-muted-foreground mb-2">
              JSON со структурой вопросов, формул и шаблонов отчётов (без прохождений).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleExportConfig}>
                <Download className="mr-2 h-4 w-4" />
                Экспорт JSON
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => importInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Импорт JSON
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="title">Название теста</FieldLabel>
            <Input
              id="title"
              value={test?.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Введите название теста"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Описание</FieldLabel>
            <Textarea
              id="description"
              value={test?.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Краткое описание теста"
              rows={3}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="instruction">Инструкция для прохождения</FieldLabel>
            <Textarea
              id="instruction"
              value={test?.instruction || ''}
              onChange={(e) => handleChange('instruction', e.target.value)}
              placeholder="Инструкции, которые увидит клиент перед началом теста"
              rows={4}
            />
          </Field>
          <Field className="flex flex-row items-center justify-between rounded-lg border p-4">
            <FieldLabel className="text-base">Персональные данные перед стартом</FieldLabel>
            <Switch
              checked={test?.requiresPersonalData !== false}
              onCheckedChange={(v) => setTest({ ...test, requiresPersonalData: v })}
            />
          </Field>
          <Field className="flex flex-row items-center justify-between rounded-lg border p-4">
            <FieldLabel className="text-base">Показывать клиентский отчёт</FieldLabel>
            <Switch
              checked={test?.showClientReport !== false}
              onCheckedChange={(v) => setTest({ ...test, showClientReport: v })}
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
