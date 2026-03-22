'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, FileText, X, Info } from 'lucide-react'

import { useTestEditor } from '@/lib/contexts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'

export function TestReportsEditor() {
  const { test, setTest } = useTestEditor()
  const clientInputRef = useRef<HTMLInputElement>(null)
  const professionalInputRef = useRef<HTMLInputElement>(null)

  const [clientFile, setClientFile] = useState<string | null>(null)
  const [professionalFile, setProfessionalFile] = useState<string | null>(null)

  useEffect(() => {
    const ct = test?.clientReportTemplate
    const pt = test?.professionalReportTemplate
    if (ct && !ct.includes('\n') && ct.endsWith('.docx')) {
      setClientFile(ct)
    } else {
      setClientFile(null)
    }
    if (pt && !pt.includes('\n') && pt.endsWith('.docx')) {
      setProfessionalFile(pt)
    } else {
      setProfessionalFile(null)
    }
  }, [test?.id, test?.clientReportTemplate, test?.professionalReportTemplate])

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'client' | 'professional'
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      if (type === 'client') {
        setClientFile(file.name)
        setTest({ ...test, clientReportTemplate: text })
      } else {
        setProfessionalFile(file.name)
        setTest({ ...test, professionalReportTemplate: text })
      }
    }
    reader.readAsText(file, 'UTF-8')
    event.target.value = ''
  }

  const handleRemoveFile = (type: 'client' | 'professional') => {
    if (type === 'client') {
      setClientFile(null)
      setTest({ ...test, clientReportTemplate: undefined })
    } else {
      setProfessionalFile(null)
      setTest({ ...test, professionalReportTemplate: undefined })
    }
  }

  const variables = [
    { name: '{{ client_name }}', description: 'Имя (и clientName)' },
    { name: '{{ client_age }}', description: 'Возраст' },
    { name: '{{ test_name }}', description: 'Название теста' },
    { name: '{{ metrics_ascii_bars }}', description: 'Текстовый график профиля' },
    { name: '{% for m in metrics %}', description: 'Шкала: m.scale, m.norm, m.raw_display' },
    { name: '{{ interpretation }}', description: 'Автоинтерпретация' },
    { name: '{{ answers_raw }}', description: 'Ответы текстом (проф.)' },
  ]

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Текстовый шаблон для DOCX рендерится через Jinja2: строки → абзацы. Доступны{' '}
          <code className="bg-muted px-1 rounded">{'{{ client_name }}'}</code>, циклы{' '}
          <code className="bg-muted px-1 rounded">{'{% for m in metrics %}'}</code> и т.д. HTML-шаблоны —
          поля <code className="bg-muted px-1 rounded">clientReportHtmlTemplate</code> /{' '}
          <code className="bg-muted px-1 rounded">professionalReportHtmlTemplate</code> в теле сохранения теста.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Отчёт для клиента</CardTitle>
            <CardDescription>Текст шаблона (DOCX генерируется из текста)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field>
              <FieldLabel>Содержимое шаблона</FieldLabel>
              <Textarea
                rows={10}
                className="font-mono text-sm"
                placeholder={`Уважаемый(ая) {{clientName}}!\n\nТест: {{testTitle}}\n{{metrics_lines}}\n\n{{interpretation}}`}
                value={
                  test?.clientReportTemplate &&
                  (test.clientReportTemplate.includes('\n') ||
                    !test.clientReportTemplate.endsWith('.docx'))
                    ? test.clientReportTemplate
                    : ''
                }
                onChange={(e) => {
                  setClientFile(null)
                  setTest({ ...test, clientReportTemplate: e.target.value })
                }}
              />
            </Field>
            <input
              ref={clientInputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'client')}
            />
            {clientFile ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <FileText className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{clientFile}</p>
                  <p className="text-xs text-muted-foreground">Импортирован как текст</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveFile('client')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={() => clientInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Импорт из файла (.txt)
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Профессиональный отчёт</CardTitle>
            <CardDescription>Текст шаблона для специалиста</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field>
              <FieldLabel>Содержимое шаблона</FieldLabel>
              <Textarea
                rows={10}
                className="font-mono text-sm"
                placeholder={'Клиент: {{clientName}}\nТест: {{testTitle}}\n{{metrics_lines}}'}
                value={
                  test?.professionalReportTemplate &&
                  (test.professionalReportTemplate.includes('\n') ||
                    !test.professionalReportTemplate.endsWith('.docx'))
                    ? test.professionalReportTemplate
                    : ''
                }
                onChange={(e) => {
                  setProfessionalFile(null)
                  setTest({ ...test, professionalReportTemplate: e.target.value })
                }}
              />
            </Field>
            <input
              ref={professionalInputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'professional')}
            />
            {professionalFile ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <FileText className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{professionalFile}</p>
                  <p className="text-xs text-muted-foreground">Импортирован как текст</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveFile('professional')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={() => professionalInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Импорт из файла (.txt)
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Доступные переменные (DOCX)</CardTitle>
          <CardDescription>Соответствуют подстановке на сервере</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {variables.map((v) => (
              <Badge key={v.name} variant="secondary" className="font-mono">
                {v.name}
                <span className="ml-2 font-normal text-muted-foreground">— {v.description}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
