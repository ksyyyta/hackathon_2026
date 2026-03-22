'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { TestEditorProvider, useTestEditor } from '@/lib/contexts'
import { api } from '@/lib/api'
import type { Test } from '@/lib/types'
import { TestBasicSettings } from '@/components/test-editor/basic-settings'
import { TestFormulasEditor } from '@/components/test-editor/formulas-editor'
import { TestReportsEditor } from '@/components/test-editor/reports-editor'
import { TestPreviewDialog } from '@/components/test-editor/preview-dialog'

/** DnD только на клиенте — иначе возможны ошибки гидрации Next.js + @dnd-kit */
const TestQuestionsEditor = dynamic(
  () =>
    import('@/components/test-editor/questions-editor').then((m) => m.TestQuestionsEditor),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[min(24rem,50vh)] w-full rounded-lg" />,
  }
)

export default function TestEditorPage() {
  const params = useParams()
  const testId = params.id as string
  const [test, setTest] = useState<Test | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const data = await api.getTest(testId)
        setTest(data)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Не удалось загрузить тест'
        toast.error(msg)
        setTest(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTest()
  }, [testId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  if (!test) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Тест не найден</p>
      </div>
    )
  }

  return (
    <TestEditorProvider initialTest={test}>
      <TestEditorContent />
    </TestEditorProvider>
  )
}

function TestEditorContent() {
  const router = useRouter()
  const { test, save, isSaving } = useTestEditor()
  const [previewOpen, setPreviewOpen] = useState(false)

  const handleSave = async () => {
    try {
      await save()
      toast.success('Тест сохранён')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка сохранения'
      toast.error(msg)
    }
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
            <h1 className="text-2xl font-bold tracking-tight line-clamp-1">
              {test?.title || 'Редактирование теста'}
            </h1>
            <p className="text-muted-foreground">Конструктор теста</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Предпросмотр
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Сохранить
          </Button>
        </div>
      </div>

      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Основное</TabsTrigger>
          <TabsTrigger value="questions">Вопросы</TabsTrigger>
          <TabsTrigger value="formulas">Подсчет результата</TabsTrigger>
          <TabsTrigger value="reports">Отчёты</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <TestBasicSettings />
        </TabsContent>

        <TabsContent value="questions">
          <TestQuestionsEditor />
        </TabsContent>

        <TabsContent value="formulas">
          <TestFormulasEditor />
        </TabsContent>

        <TabsContent value="reports">
          <TestReportsEditor />
        </TabsContent>
      </Tabs>

      <TestPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  )
}
